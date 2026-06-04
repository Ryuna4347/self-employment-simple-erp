import { useEffect, useState } from "react"

/**
 * 값이 변경된 뒤 지정한 delay(ms) 동안 추가 변경이 없을 때만 갱신되는 디바운스 훅.
 *
 * 검색어 입력처럼 타이핑 도중 매번 요청이 발생하는 것을 막을 때 사용한다.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
