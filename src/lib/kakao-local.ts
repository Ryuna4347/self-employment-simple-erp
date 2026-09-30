/**
 * Kakao 로컬 API — 키워드로 장소 검색 (서버 전용)
 *
 * - REST API 키는 서버 환경변수 `KAKAO_REST_API_KEY` 에만 둔다 (NEXT_PUBLIC_ 접두사 금지 → 브라우저 노출 방지)
 * - 키가 없으면 기능 비활성: 매장 검색 버튼이 숨겨지고 API는 503을 반환한다
 * - 문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
 * - 무료 쿼터: 일 100,000건 (개발자 계정 기준 첫 번째 카카오맵 API 활성화 앱)
 *
 * 클라이언트 컴포넌트에서는 이 파일을 값으로 import 하지 말 것 (타입만 `import type` 허용)
 */
import { z } from "zod"

const KEYWORD_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
const REQUEST_TIMEOUT_MS = 5000
// Kakao API 한 페이지 최대 문서 수
const MAX_PAGE_SIZE = 15

/** 매장 검색 결과 (정규화) */
export interface PlaceSearchItem {
  /** 카카오 장소 ID (Store.kakaoPlaceId) */
  id: string
  /** 장소명/업체명 */
  name: string
  /** 카테고리 (예: "음식점 > 한식 > 냉면") */
  category: string
  /** 도로명 주소 (없을 수 있음) */
  roadAddress: string
  /** 지번 주소 */
  jibunAddress: string
  phone: string
  latitude: number | null
  longitude: number | null
}

/** GET /api/places/search 응답 항목: 검색 결과 + 이미 등록된 매장 정보 */
export interface PlaceSearchResult extends PlaceSearchItem {
  /** 같은 장소(kakaoPlaceId)로 이미 등록된 활성 매장 */
  registeredStore: { id: string; name: string } | null
}

/** Kakao API 호출 실패 */
export class KakaoLocalError extends Error {
  constructor(
    message: string,
    /** Kakao 응답 HTTP 상태 (네트워크/타임아웃 오류는 0) */
    public readonly status: number,
    public readonly kind: "config" | "quota" | "unavailable",
  ) {
    super(message)
    this.name = "KakaoLocalError"
  }
}

export function getKakaoRestApiKey(): string | null {
  const key = process.env.KAKAO_REST_API_KEY?.trim()
  return key ? key : null
}

/** 매장 검색 기능 사용 가능 여부 (서버에서만 호출) */
export function isPlaceSearchEnabled(): boolean {
  return getKakaoRestApiKey() !== null
}

// 응답 스키마 — 필요한 필드만 검증, 부가 필드 누락은 빈 문자열로 허용
const documentSchema = z.object({
  id: z.string().min(1),
  place_name: z.string(),
  category_name: z.string().catch(""),
  phone: z.string().catch(""),
  address_name: z.string().catch(""),
  road_address_name: z.string().catch(""),
  x: z.string().catch(""),
  y: z.string().catch(""),
})

const responseSchema = z.object({
  documents: z.array(z.unknown()),
})

function toCoordinate(value: string): number | null {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : null
}

function classifyError(status: number, body: unknown): KakaoLocalError["kind"] {
  if (status === 401 || status === 403) return "config"
  // 로컬 API 쿼터 초과: 429 (공통 에러 코드 -10 "API limit has been exceeded"도 쿼터로 취급)
  const code = typeof body === "object" && body !== null && "code" in body ? body.code : undefined
  if (status === 429 || code === -10) return "quota"
  return "unavailable"
}

/**
 * 키워드(상호 등)로 장소 검색
 * @throws {KakaoLocalError} Kakao 응답 오류 / 네트워크 오류 / 타임아웃
 */
export async function searchPlacesByKeyword(
  query: string,
  apiKey: string,
  size: number = MAX_PAGE_SIZE,
): Promise<PlaceSearchItem[]> {
  const params = new URLSearchParams({
    query,
    size: String(Math.min(Math.max(size, 1), MAX_PAGE_SIZE)),
  })

  let response: Response
  try {
    response = await fetch(`${KEYWORD_SEARCH_URL}?${params.toString()}`, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    throw new KakaoLocalError(
      `Kakao 로컬 API 요청 실패: ${error instanceof Error ? error.message : String(error)}`,
      0,
      "unavailable",
    )
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const detail =
      typeof body === "object" && body !== null
        ? JSON.stringify(body).slice(0, 300)
        : `HTTP ${response.status}`
    throw new KakaoLocalError(
      `Kakao 로컬 API 오류 (${response.status}): ${detail}`,
      response.status,
      classifyError(response.status, body),
    )
  }

  const parsed = responseSchema.safeParse(body)
  if (!parsed.success) {
    throw new KakaoLocalError("Kakao 로컬 API 응답 형식이 올바르지 않습니다", response.status, "unavailable")
  }

  // 형식이 어긋난 문서는 건너뛴다 (전체 실패 방지)
  return parsed.data.documents.flatMap((raw) => {
    const doc = documentSchema.safeParse(raw)
    if (!doc.success) return []
    const d = doc.data
    return [
      {
        id: d.id,
        name: d.place_name,
        category: d.category_name,
        roadAddress: d.road_address_name,
        jibunAddress: d.address_name,
        phone: d.phone,
        latitude: toCoordinate(d.y),
        longitude: toCoordinate(d.x),
      },
    ]
  })
}
