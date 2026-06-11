"use client"

import { useEffect, useRef } from "react"

/**
 * IntersectionObserver 기반 무한 스크롤 트리거 훅
 *
 * 반환된 ref를 목록 하단의 sentinel 요소에 부착하면, 요소가 뷰포트에
 * 들어올 때 다음 페이지를 요청한다. useInfiniteQuery 산출물을 그대로 받는다.
 * (외부 시스템 구독만 수행하며 setState 없음 — React 19 규칙과 무관)
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return ref
}
