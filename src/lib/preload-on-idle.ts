/**
 * 브라우저가 한가할 때 동적 import(코드 청크)를 미리 받아둔다.
 *
 * next/dynamic으로 분리한 모달은 초기 번들에서 빠지는 대신 처음 열 때 청크를 받아야 한다.
 * 첫 화면을 그린 뒤 유휴 시간에 미리 받아두면 초기 로드는 가볍게, 첫 오픈은 지연 없이 유지할 수 있다.
 *
 * @param loaders `() => import("...")` 형태의 로더 목록.
 *   **next/dynamic에 넘긴 것과 같은 로더 함수**를 넘겨야 한다. 번들러는 `import()` 호출 위치마다
 *   청크를 따로 만들기 때문에, 같은 경로라도 `import()`를 새로 쓰면 다른 청크를 받게 된다.
 * @returns 예약 취소 함수 (useEffect cleanup으로 그대로 반환)
 *
 * @example
 * const loadSomeModal = () => import("./some-modal")
 * const SomeModal = dynamic(() => loadSomeModal().then((m) => m.SomeModal), { ssr: false })
 *
 * useEffect(() => {
 *   if (!isReady) return
 *   return preloadOnIdle([loadSomeModal])
 * }, [isReady])
 */
export function preloadOnIdle(
  loaders: ReadonlyArray<() => Promise<unknown>>
): () => void {
  if (typeof window === "undefined") return () => {}

  const run = () => {
    for (const load of loaders) {
      // 미리 받기 실패는 무시한다 (실제로 열 때 next/dynamic이 다시 불러온다)
      load().catch(() => {})
    }
  }

  // requestIdleCallback 미지원 브라우저(Safari 등)는 setTimeout으로 대체
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 3000 })
    return () => window.cancelIdleCallback(id)
  }

  const id = window.setTimeout(run, 1500)
  return () => window.clearTimeout(id)
}
