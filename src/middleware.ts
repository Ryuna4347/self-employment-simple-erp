import NextAuth from "next-auth"
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server"
import { authConfig } from "./auth.config"

// =============================================================================
// 미들웨어 (Auth + 점검 모드)
// -----------------------------------------------------------------------------
// 환경변수 `MAINTENANCE_MODE` 가 "true" / "1" 일 때 점검 모드로 전환된다.
//   - 모든 페이지 요청 → /maintenance 페이지로 rewrite (URL은 유지)
//   - 모든 API 요청 → 503 JSON 응답으로 차단 (인증/크론 포함)
//   - /maintenance 자체는 통과시켜 점검 페이지가 렌더링되도록 한다.
//
// 그 외에는 기존 NextAuth `authorized` 콜백 기반 동작을 그대로 유지한다.
//
// 점검 모드 토글:
//   MAINTENANCE_MODE=true   # 점검 시작
//   MAINTENANCE_MODE=false  # 점검 해제 (또는 변수 제거)
// =============================================================================

const MAINTENANCE_PATH = "/maintenance"

// 정상 모드에서 NextAuth 인증을 적용하지 않을 경로.
// (점검 모드에서는 이 목록과 무관하게 모두 차단된다.)
const AUTH_BYPASS_PREFIXES = ["/api/auth", "/api/register", "/api/cron"] as const
const AUTH_BYPASS_PATHS = new Set<string>(["/register", MAINTENANCE_PATH])

function isMaintenanceMode(): boolean {
  const flag = process.env.MAINTENANCE_MODE?.toLowerCase()
  return flag === "true" || flag === "1" || flag === "on"
}

function maintenanceResponse(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  // 점검 페이지 자체는 통과시켜 실제로 렌더링한다.
  if (pathname === MAINTENANCE_PATH) {
    return NextResponse.next()
  }

  // API 요청은 모두 503 JSON 으로 차단한다. (auth / cron 포함)
  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MAINTENANCE",
          message: "서비스 점검 중입니다. 잠시 후 다시 이용해주세요.",
        },
      },
      { status: 503 }
    )
  }

  // 그 외 모든 페이지는 /maintenance 로 rewrite (URL은 유지).
  const url = request.nextUrl.clone()
  url.pathname = MAINTENANCE_PATH
  url.search = ""
  return NextResponse.rewrite(url, {
    headers: {
      "X-Robots-Tag": "noindex",
      "Retry-After": "3600",
    },
  })
}

const { auth } = NextAuth(authConfig)

// NextAuth v5 의 `auth` 는 미들웨어 시그니처로도 호출 가능하다.
type NextAuthMiddleware = (
  request: NextRequest,
  event: NextFetchEvent
) => Promise<NextResponse | undefined> | NextResponse | undefined

export default function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  if (isMaintenanceMode()) {
    return maintenanceResponse(request)
  }

  // 정상 모드: 인증 제외 경로는 NextAuth 미들웨어를 거치지 않고 통과시킨다.
  const { pathname } = request.nextUrl
  if (
    AUTH_BYPASS_PATHS.has(pathname) ||
    AUTH_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next()
  }

  // 그 외는 NextAuth 의 authorized 콜백 결과를 그대로 사용한다.
  return (auth as unknown as NextAuthMiddleware)(request, event)
}

export const config = {
  // 정적 자원과 Next.js 내부 경로만 제외하고 전부 가로챈다.
  // (점검 모드에서 /api/auth, /api/cron 등도 차단해야 하므로 매처는 항상 넓게 둔다.
  //  정상 모드에서는 미들웨어 함수 내부에서 인증 제외 경로를 통과시킨다.)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$|.*\\.gif$).*)",
  ],
}
