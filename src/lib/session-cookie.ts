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

/**
 * 쿠키 수정이 가능한 환경인지 테스트
 * - Route Handler, Server Action: true
 * - Server Component 렌더링 중: false
 *
 * 이 함수는 auth.ts JWT 콜백에서 refresh token rotation 전에 호출하여
 * 서버 컴포넌트에서 DB 수정 후 JWT 저장 실패로 인한 "Token reuse" 방지
 */
export async function canModifyCookies(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    // 테스트용 쿠키를 설정해서 수정 가능 여부 확인
    cookieStore.set("__cookie_test", "1", { maxAge: 0 })
    return true
  } catch {
    return false
  }
}

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
// Note: Route Handler/Server Action에서만 호출 가능
export async function createSessionCookie(rememberMe: boolean) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      getSessionOptions(rememberMe)
    )
    session.isLoggedIn = true
    session.rememberMe = rememberMe
    await session.save()
  } catch {
    // 서버 컴포넌트 렌더링 중에는 쿠키 수정 불가 - 무시
  }
}

// 세션 쿠키 갱신 (슬라이딩 - rememberMe=true만 호출)
// Note: Route Handler/Server Action에서만 쿠키 수정 가능
// 서버 컴포넌트에서 auth() 호출 시에는 조용히 실패
export async function renewSessionCookie() {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      getSessionOptions(true) // persistent cookie로 갱신
    )
    // 이미 있는 세션이면 다시 저장 (maxAge 리셋)
    if (session.isLoggedIn) {
      await session.save()
    }
  } catch {
    // 서버 컴포넌트 렌더링 중에는 쿠키 수정 불가 - 무시
  }
}

// 세션 쿠키 삭제
// Note: Route Handler/Server Action에서만 호출 가능
export async function destroySessionCookie() {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      getSessionOptions(true)
    )
    session.destroy()
  } catch {
    // 서버 컴포넌트 렌더링 중에는 쿠키 수정 불가 - 무시
  }
}
