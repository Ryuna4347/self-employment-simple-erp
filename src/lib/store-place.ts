/**
 * 매장 ↔ 카카오 장소(kakaoPlaceId) 연결 규칙 (서버 전용)
 *
 * Store.kakaoPlaceId 는 @unique 이므로 저장 전에 중복을 확인한다.
 * - 다른 "활성" 매장이 같은 장소에 연결돼 있으면 → 중복 등록으로 보고 거부 (409)
 * - "삭제된" 매장이 같은 장소를 쥐고 있으면 → 삭제 매장의 장소 연결만 해제하고 진행
 *   (삭제한 매장을 같은 장소로 다시 등록할 수 있도록. 삭제 매장의 다른 데이터는 건드리지 않음)
 */
import { Prisma } from "@/generated/prisma/client"

/** 다른 활성 매장이 이미 같은 장소에 연결된 경우 */
export class StorePlaceConflictError extends Error {
  constructor(public readonly storeName: string) {
    super(`이미 같은 장소로 등록된 매장이 있습니다: ${storeName}`)
    this.name = "StorePlaceConflictError"
  }
}

/**
 * kakaoPlaceId 중복 확인 (트랜잭션 안에서 저장 직전에 호출)
 * @param currentStoreId 수정 중인 매장 ID (자기 자신은 제외)
 * @throws {StorePlaceConflictError}
 */
export async function ensureKakaoPlaceAvailable(
  tx: Prisma.TransactionClient,
  kakaoPlaceId: string | null | undefined,
  currentStoreId?: string,
): Promise<void> {
  if (!kakaoPlaceId) return

  const owner = await tx.store.findFirst({
    where: {
      kakaoPlaceId,
      ...(currentStoreId && { id: { not: currentStoreId } }),
    },
    select: { id: true, name: true, isDeleted: true },
  })
  if (!owner) return

  if (!owner.isDeleted) {
    throw new StorePlaceConflictError(owner.name)
  }

  await tx.store.update({
    where: { id: owner.id },
    data: { kakaoPlaceId: null },
  })
}

/** 동시 저장 등으로 unique 제약에 걸린 경우 (사전 확인을 통과한 경합 상황) */
export function isKakaoPlaceUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false
  }
  // 드라이버 어댑터(pg)에 따라 meta 구조(target / driverAdapterError)가 달라 문자열로 비교
  return JSON.stringify(error.meta ?? {}).includes("kakaoPlaceId")
}
