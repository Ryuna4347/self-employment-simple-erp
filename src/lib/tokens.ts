import { prisma } from "@/lib/prisma"
import { randomBytes, createHash } from "crypto"

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000  // 7일

// 토큰 해시
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

// Refresh Token 생성
export async function createRefreshToken(userId: string, rememberMe: boolean) {
  if (!rememberMe) return null

  const token = randomBytes(32).toString("hex")
  const tokenHash = hashToken(token)
  const familyId = randomBytes(16).toString("hex")  // 새 토큰 체인 시작
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE)

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      familyId,
      expiresAt,
    },
  })

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

// Token Rotation (기존 폐기 + 새 토큰 발급 + 재사용 공격 탐지)
export async function rotateRefreshToken(
  oldToken: string,
  userId: string
): Promise<{ newToken: string } | { error: "INVALID" | "REUSED" }> {
  const oldTokenHash = hashToken(oldToken)

  return await prisma.$transaction(async (tx) => {
    // 1. 기존 토큰 조회
    const existing = await tx.refreshToken.findUnique({
      where: { tokenHash: oldTokenHash }
    })

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
}

// 특정 토큰 폐기 (로그아웃 시)
export async function revokeRefreshToken(token: string) {
  const tokenHash = hashToken(token)
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() }
  })
}

// 사용자의 모든 토큰 폐기 (모든 기기 로그아웃)
export async function revokeAllUserTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  })
}
