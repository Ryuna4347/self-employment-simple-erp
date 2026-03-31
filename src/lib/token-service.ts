import { createHash, randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { REFRESH_TOKEN_MAX_AGE } from "@/lib/jwt"

/**
 * 랜덤 refreshToken 생성
 */
export function generateRefreshToken(): string {
  return randomUUID()
}

/**
 * 토큰을 SHA-256 해시로 변환
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * refreshToken을 DB에 저장
 */
export async function createRefreshToken(
  userId: string,
  token: string,
  rememberMe: boolean
) {
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000)

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      rememberMe,
      expiresAt,
    },
  })

  return { tokenHash, expiresAt }
}

/**
 * refreshToken 검증: DB 조회 + 만료 비교
 * @returns 유효하면 토큰 레코드, 아니면 null
 */
export async function validateRefreshToken(token: string) {
  const tokenHash = hashToken(token)

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { User: true },
  })

  if (!record) return null

  // 만료 체크
  if (record.expiresAt < new Date()) {
    // 만료된 토큰 삭제
    await prisma.refreshToken.delete({ where: { id: record.id } })
    return null
  }

  // 삭제된 사용자 체크
  if (record.User.isDeleted) {
    await prisma.refreshToken.delete({ where: { id: record.id } })
    return null
  }

  return record
}

/**
 * refreshToken 갱신이 필요한지 확인 (만료까지 3일 이내)
 */
// TODO: 테스트용 주석처리 — 원복 필요
// export function needsRefreshTokenRotation(
//   expiresAt: Date,
//   rememberMe: boolean
// ): boolean {
//   if (!rememberMe) return false
//   const remainingMs = expiresAt.getTime() - Date.now()
//   return remainingMs < REFRESH_RENEW_THRESHOLD * 1000
// }

/**
 * 특정 refreshToken 삭제 (해시 기반)
 */
export async function deleteRefreshToken(tokenHash: string) {
  await prisma.refreshToken.delete({ where: { tokenHash } }).catch(() => {
    // 이미 삭제된 경우 무시
  })
}

/**
 * 사용자의 모든 refreshToken 삭제 (전체 로그아웃)
 */
export async function deleteUserRefreshTokens(userId: string) {
  await prisma.refreshToken.deleteMany({ where: { userId } })
}
