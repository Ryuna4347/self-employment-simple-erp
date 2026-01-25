import { getIronSession, SessionOptions } from "iron-session"
import { cookies } from "next/headers"

// SESSION_SECRET 환경변수 검증
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET 환경변수가 설정되지 않았거나 32자 미만입니다. " +
      ".env 파일에 32자 이상의 SESSION_SECRET을 설정하세요."
    )
  }
  return secret
}

// 세션 데이터 타입
interface SessionData {
  isLoggedIn: boolean
  rememberMe: boolean // 갱신 시 필요
}

// 상수
export const SESSION_COOKIE_NAME = "session-check"
const SEVEN_DAYS = 7 * 24 * 60 * 60 // 초 단위

// 세션 옵션 생성 (rememberMe에 따라 maxAge 동적 설정)
function getSessionOptions(rememberMe: boolean): SessionOptions {
  return {
    cookieName: SESSION_COOKIE_NAME,
    password: getSessionSecret(),
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: rememberMe ? SEVEN_DAYS : undefined, // undefined = 세션 쿠키
    },
  }
}

// 세션 쿠키 생성
export async function createSessionCookie(rememberMe: boolean) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(rememberMe)
  )
  session.isLoggedIn = true
  session.rememberMe = rememberMe
  await session.save()
}

// 세션 쿠키 갱신 (슬라이딩 - rememberMe=true만 호출)
export async function renewSessionCookie() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(true) // persistent cookie로 갱신
  )
  // 이미 있는 세션이면 다시 저장 (maxAge 리셋)
  if (session.isLoggedIn) {
    await session.save()
  }
}

// 세션 쿠키 삭제
export async function destroySessionCookie() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(true)
  )
  session.destroy()
}
