/**
 * 주소 → 지도 앱 연동 / 주소 복사 유틸
 *
 * - 지도 앱은 좌표 없이 "주소 문자열 검색"으로 연다 (매장 좌표가 대부분 비어 있음)
 * - Android: 인텐트 URL 사용 → 앱 설치 시 앱 실행, 미설치 시 browser_fallback_url(웹 지도)로 이동
 * - iOS: 커스텀 스킴 호출 후 일정 시간 내 페이지가 가려지지 않으면(앱 미실행) onAppNotOpened 콜백
 * - 그 외(태블릿 등 판별 불가): 웹 지도를 새 탭으로 연다
 *
 * 참고 문서
 * - 네이버 지도 URL Scheme: https://guide.ncloud-docs.com/docs/maps-url-scheme
 * - 카카오맵 URL Scheme: kakaomap://search?q= (Kakao 지도 API 가이드)
 * - 카카오맵 웹 링크: https://map.kakao.com/link/search/{검색어}
 */

// 지도 앱 종류
export type MapApp = "kakao" | "naver"

// 주소 탭 시 실행 가능한 동작 (지도 앱 + 복사)
export type AddressAction = MapApp | "copy"

// 선택 시트 / 설정 화면 표시 순서
export const ADDRESS_ACTIONS: readonly AddressAction[] = ["kakao", "naver", "copy"]

/**
 * [임시] 데스크톱(터치 아님)에서도 주소 클릭 시 선택 시트를 띄운다.
 * 데스크톱에는 지도 앱이 없으므로 지도는 네이버지도 웹(새 탭)으로만 연결하고, 시트에서 카카오맵은 숨긴다.
 * false로 바꾸면 기존 동작(데스크톱은 즉시 주소 복사)으로 돌아간다.
 */
export const DESKTOP_ADDRESS_SHEET_ENABLED = true

// 데스크톱 선택 시트 표시 순서 (지도는 네이버지도 웹만)
export const DESKTOP_ADDRESS_ACTIONS: readonly AddressAction[] = ["naver", "copy"]

export const ADDRESS_ACTION_LABELS: Record<AddressAction, string> = {
  kakao: "카카오맵",
  naver: "네이버지도",
  copy: "주소 복사",
}

export function isAddressAction(value: unknown): value is AddressAction {
  return typeof value === "string" && (ADDRESS_ACTIONS as readonly string[]).includes(value)
}

interface MapAppConfig {
  /** 커스텀 URL 스킴 (:// 제외) */
  scheme: string
  /** Android 패키지명 (인텐트 URL용) */
  androidPackage: string
  /** 스킴 뒤에 붙는 경로+쿼리 (query는 인코딩된 값) */
  buildAppPath: (encodedQuery: string, encodedAppName: string) => string
  /** 앱 미설치 시 대체할 웹 지도 URL */
  buildWebUrl: (encodedQuery: string) => string
}

const MAP_APP_CONFIG: Record<MapApp, MapAppConfig> = {
  kakao: {
    scheme: "kakaomap",
    androidPackage: "net.daum.android.map",
    buildAppPath: (q) => `search?q=${q}`,
    buildWebUrl: (q) => `https://map.kakao.com/link/search/${q}`,
  },
  naver: {
    scheme: "nmap",
    androidPackage: "com.nhn.android.nmap",
    // appname 필수 (모바일 웹은 웹 페이지 URL)
    buildAppPath: (q, appName) => `search?query=${q}&appname=${appName}`,
    buildWebUrl: (q) => `https://map.naver.com/p/search/${q}`,
  },
}

// iOS 앱 실행 여부 판정 대기 시간
const APP_LAUNCH_TIMEOUT_MS = 2000

type MobilePlatform = "android" | "ios" | "other"

function detectPlatform(): MobilePlatform {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return "android"
  // iPadOS 13+는 데스크톱(Macintosh) UA를 쓰므로 터치 포인트로 구분
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    return "ios"
  }
  return "other"
}

/** 지도 앱의 웹 URL (앱 미설치 시 대체용) */
export function getMapWebUrl(app: MapApp, address: string): string {
  return MAP_APP_CONFIG[app].buildWebUrl(encodeURIComponent(address.trim()))
}

/** 웹 지도를 새 탭으로 연다 (사용자 제스처 안에서 호출해야 팝업 차단을 피함) */
export function openMapWeb(webUrl: string): void {
  window.open(webUrl, "_blank", "noopener,noreferrer")
}

/**
 * iOS: 커스텀 스킴 호출 후 앱이 열리지 않았으면 콜백
 * - 앱이 열리면 페이지가 hidden 되거나 타이머가 지연 실행되므로 이를 기준으로 판정
 */
function launchSchemeWithFallback(schemeUrl: string, onNotOpened: () => void): void {
  const startedAt = Date.now()
  let pageLeft = false

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") pageLeft = true
  }
  const handlePageHide = () => {
    pageLeft = true
  }

  document.addEventListener("visibilitychange", handleVisibilityChange)
  window.addEventListener("pagehide", handlePageHide)

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    window.removeEventListener("pagehide", handlePageHide)

    // 앱 전환 중에는 타이머가 멈췄다가 늦게 실행됨 → 지연이 크면 앱이 열린 것으로 간주
    const delayed = Date.now() - startedAt > APP_LAUNCH_TIMEOUT_MS + 1000
    if (!pageLeft && !delayed && document.visibilityState === "visible") {
      onNotOpened()
    }
  }, APP_LAUNCH_TIMEOUT_MS)

  window.location.href = schemeUrl
}

interface OpenMapAppOptions {
  /** iOS에서 앱이 열리지 않은 것으로 판단될 때 (웹 지도 URL 전달) */
  onAppNotOpened?: (webUrl: string) => void
}

/** 주소로 지도 앱 검색 화면을 연다 */
export function openMapApp(app: MapApp, address: string, options: OpenMapAppOptions = {}): void {
  const config = MAP_APP_CONFIG[app]
  const encodedQuery = encodeURIComponent(address.trim())
  const encodedAppName = encodeURIComponent(window.location.origin)
  const appPath = config.buildAppPath(encodedQuery, encodedAppName)
  const webUrl = config.buildWebUrl(encodedQuery)

  switch (detectPlatform()) {
    case "android": {
      window.location.href =
        `intent://${appPath}#Intent;scheme=${config.scheme};` +
        "action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;" +
        `package=${config.androidPackage};` +
        `S.browser_fallback_url=${encodeURIComponent(webUrl)};end`
      return
    }
    case "ios": {
      launchSchemeWithFallback(`${config.scheme}://${appPath}`, () => options.onAppNotOpened?.(webUrl))
      return
    }
    default: {
      openMapWeb(webUrl)
    }
  }
}

/** 주소를 클립보드에 복사 (성공 여부 반환) */
export async function copyAddressToClipboard(address: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) return false
    await navigator.clipboard.writeText(address)
    return true
  } catch {
    return false
  }
}
