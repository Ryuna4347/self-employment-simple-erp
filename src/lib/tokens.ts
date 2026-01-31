import { prisma } from "@/lib/prisma"
import { randomBytes, createHash } from "crypto"
import { Prisma } from "@/generated/prisma/client"

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000  // 7일
const MAX_ROTATION_RETRIES = 3  // 최대 재시도 횟수

// SELECT FOR UPDATE NOWAIT 결과 타입
interface RefreshTokenRow {
  id: string
  userId: string
  familyId: string
  expiresAt: Date
  revokedAt: Date | null
}

// 토큰 해시
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

// Refresh Token 생성
export async function createRefreshToken(userId: string, rememberMe: boolean) {
  console.log("[DEBUG createRefreshToken] 호출됨, userId:", userId, "rememberMe:", rememberMe)
  if (!rememberMe) {
    console.log("[DEBUG createRefreshToken] rememberMe=false, null 반환")
    return null
  }

  const token = randomBytes(32).toString("hex")
  const tokenHash = hashToken(token)
  const familyId = randomBytes(16).toString("hex")  // 새 토큰 체인 시작
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE)

  console.log("[DEBUG createRefreshToken] DB 저장 시작, familyId:", familyId)
  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      familyId,
      expiresAt,
    },
  })
  console.log("[DEBUG createRefreshToken] DB 저장 완료, 토큰 생성됨")

  return { token, expiresAt }
}

// Refresh Token 검증
export async function verifyRefreshToken(token: string) {
  const tokenHash = hashToken(token)

  const refreshToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!refreshToken) return null
  if (refreshToken.revokedAt !== null) return null
  if (refreshToken.expiresAt < new Date()) return null
  if (refreshToken.user.isDeleted) return null

  return refreshToken
}

// PostgreSQL 락 획득 실패 에러인지 확인
function isLockNotAvailableError(error: unknown): boolean {
  // PostgreSQL 에러 코드 55P03: lock_not_available
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Prisma가 래핑한 PostgreSQL 에러 확인
    const cause = error.cause as { code?: string } | undefined
    return cause?.code === "55P03"
  }
  // raw 에러 메시지 확인
  if (error instanceof Error) {
    return error.message.includes("could not obtain lock") ||
           error.message.includes("lock_not_available")
  }
  return false
}

// 대기 유틸리티
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Token Rotation (기존 폐기 + 새 토큰 발급 + 재사용 공격 탐지)
// SELECT FOR UPDATE NOWAIT + 재시도 로직으로 Race Condition 방지
export async function rotateRefreshToken(
  oldToken: string,
  userId: string
): Promise<{ newToken: string } | { error: "INVALID" | "REUSED" }> {
  const oldTokenHash = hashToken(oldToken)

  for (let attempt = 0; attempt < MAX_ROTATION_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. SELECT FOR UPDATE NOWAIT로 행 수준 락 획득
        // 다른 트랜잭션이 이미 이 행을 잠근 경우 즉시 에러 발생
        const rows = await tx.$queryRaw<RefreshTokenRow[]>`
          SELECT id, "userId", "familyId", "expiresAt", "revokedAt"
          FROM "RefreshToken"
          WHERE "tokenHash" = ${oldTokenHash}
          FOR UPDATE NOWAIT
        `
        const existing = rows[0]

        // 2. 토큰 유효성 검증
        if (!existing || existing.userId !== userId) {
          return { error: "INVALID" }
        }

        // 3. Token Reuse Attack 탐지 (핵심 보안 로직)
        if (existing.revokedAt !== null) {
          // 이미 폐기된 토큰 재사용 → 전체 family 무효화
          await tx.refreshToken.updateMany({
            where: { familyId: existing.familyId },
            data: { revokedAt: new Date() }
          })
          console.error(`[SECURITY] Token reuse detected for user ${userId}`)
          return { error: "REUSED" }
        }

        // 4. 만료 확인
        if (existing.expiresAt < new Date()) {
          return { error: "INVALID" }
        }

        // 5. 기존 토큰 폐기
        await tx.refreshToken.update({
          where: { id: existing.id },
          data: { revokedAt: new Date() }
        })

        // 6. 새 토큰 생성 (같은 family 유지)
        const newToken = randomBytes(32).toString("hex")
        await tx.refreshToken.create({
          data: {
            tokenHash: hashToken(newToken),
            userId,
            familyId: existing.familyId,  // 체인 유지
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE)
          }
        })

        return { newToken }
      })
    } catch (error) {
      // 락 획득 실패 시 재시도 (마지막 시도가 아닌 경우)
      if (isLockNotAvailableError(error) && attempt < MAX_ROTATION_RETRIES - 1) {
        // Exponential backoff with jitter
        const delay = Math.min(50 * Math.pow(2, attempt), 500)
        const jitter = Math.random() * 25
        console.log(`[Token Rotation] Lock not available, retrying in ${Math.round(delay + jitter)}ms (attempt ${attempt + 1}/${MAX_ROTATION_RETRIES})`)
        await sleep(delay + jitter)
        continue
      }
      // 다른 에러거나 모든 재시도 실패
      throw error
    }
  }

  // 모든 재시도 실패 (이론상 도달하지 않음)
  return { error: "INVALID" }
}

// 특정 토큰 폐기 (로그아웃 시)
export async function revokeRefreshToken(token: string) {
  const tokenHash = hashToken(token)
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() }
  })
}

// 사용자의 모든 활성 Refresh Token 폐기 (로그아웃 시 / 모든 기기 로그아웃)
export async function revokeAllUserRefreshTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  })
}

// 만료된 Refresh Token 정리 (Cron Job 용)
// - 만료 시간이 지난 토큰 삭제 (expiresAt < now)
// - 이미 폐기된 오래된 토큰도 함께 삭제 (revokedAt이 설정되고 일정 시간 경과)
export async function cleanupExpiredRefreshTokens(): Promise<{
  deletedCount: number
  executedAt: Date
}> {
  const now = new Date()

  // 만료되었거나 폐기된 지 7일 이상 지난 토큰 삭제
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        // 만료된 토큰 (expiresAt이 현재 시간보다 이전)
        { expiresAt: { lt: now } },
        // 폐기된 지 7일 이상 지난 토큰 (감사 로그 보존 기간)
        { revokedAt: { lt: sevenDaysAgo } }
      ]
    }
  })

  return {
    deletedCount: result.count,
    executedAt: now
  }
}
