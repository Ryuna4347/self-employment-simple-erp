import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireWriteAccess, isErrorResponse } from "@/lib/auth-guard"
import { apiError, apiSuccess, ApiErrors, ErrorCode } from "@/lib/api-response"
import {
  getKakaoRestApiKey,
  KakaoLocalError,
  searchPlacesByKeyword,
  type PlaceSearchItem,
  type PlaceSearchResult,
} from "@/lib/kakao-local"

const querySchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "검색어를 입력해주세요")
    .max(100, "검색어는 100자 이하로 입력해주세요"),
  // 수정 중인 매장 (자기 자신은 '이미 등록됨'에서 제외)
  excludeStoreId: z.string().min(1).optional(),
})

/**
 * GET /api/places/search?query=상호&excludeStoreId=
 *
 * 매장 등록/수정 화면의 "매장 검색" (Kakao 키워드로 장소 검색 프록시)
 * - 쓰기 권한 필요 (VIEWER 차단) — 매장을 등록/수정할 수 있는 사용자만 외부 쿼터 사용
 * - KAKAO_REST_API_KEY 미설정 시 503 FEATURE_DISABLED
 */
export async function GET(request: NextRequest) {
  const authResult = await requireWriteAccess()
  if (isErrorResponse(authResult)) return authResult

  const apiKey = getKakaoRestApiKey()
  if (!apiKey) {
    return apiError(ErrorCode.FEATURE_DISABLED, "매장 검색이 설정되지 않았습니다", 503)
  }

  const searchParams = request.nextUrl.searchParams
  const parseResult = querySchema.safeParse({
    query: searchParams.get("query") ?? "",
    excludeStoreId: searchParams.get("excludeStoreId") || undefined,
  })
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return ApiErrors.validationError(firstError.message, [
      { field: firstError.path.join("."), message: firstError.message },
    ])
  }

  const { query, excludeStoreId } = parseResult.data

  let places: PlaceSearchItem[]
  try {
    places = await searchPlacesByKeyword(query, apiKey)
  } catch (error) {
    console.error("[/api/places/search] Kakao error:", error)
    if (error instanceof KakaoLocalError) {
      if (error.kind === "quota") {
        return apiError(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          "오늘 사용할 수 있는 매장 검색 횟수를 모두 사용했습니다. 주소 검색을 이용해주세요",
          503,
        )
      }
      if (error.kind === "config") {
        return apiError(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          "매장 검색 설정에 문제가 있습니다. 관리자에게 문의해주세요",
          502,
        )
      }
    }
    return apiError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      "매장 검색 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요",
      502,
    )
  }

  try {
    // 이미 같은 장소로 등록된 활성 매장 표시 (중복 등록 방지)
    const ids = places.map((place) => place.id)
    const registered = ids.length
      ? await prisma.store.findMany({
          where: {
            kakaoPlaceId: { in: ids },
            isDeleted: false,
            ...(excludeStoreId && { id: { not: excludeStoreId } }),
          },
          select: { id: true, name: true, kakaoPlaceId: true },
        })
      : []
    const registeredByPlaceId = new Map(
      registered.map((store) => [store.kakaoPlaceId, { id: store.id, name: store.name }]),
    )

    const results: PlaceSearchResult[] = places.map((place) => ({
      ...place,
      registeredStore: registeredByPlaceId.get(place.id) ?? null,
    }))

    return apiSuccess({ places: results })
  } catch (error) {
    console.error("[/api/places/search] DB error:", error)
    return ApiErrors.internalError("매장 검색 중 오류가 발생했습니다")
  }
}
