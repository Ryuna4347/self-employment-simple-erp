/**
 * Kakao(구 Daum) 우편번호 서비스 로더 & 결과 처리
 *
 * - 무료, 별도 키 발급 없음 (행정안전부 주소DB 기반)
 * - 가이드: https://postcode.map.kakao.com/guide
 * - 스크립트는 window.kakao 와 window.daum 을 같은 객체로 설정하므로 둘 다 확인한다
 */

const POSTCODE_SCRIPT_SRC = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"

/** 우편번호 서비스 검색 결과 (사용하는 필드만 정의) */
export interface PostcodeResult {
  /** 우편번호 (5자리) */
  zonecode: string
  /** 기본 주소 (검색 결과 첫 줄 타입 기준) */
  address: string
  /** 사용자가 선택한 주소 타입: R(도로명), J(지번) */
  userSelectedType: "R" | "J"
  /** 도로명 주소 (1:N 매핑이면 빈 값일 수 있음) */
  roadAddress: string
  /** 지번 주소 (1:N 매핑이면 빈 값일 수 있음) */
  jibunAddress: string
  /** 지번 선택 시 자동 매핑된 도로명 주소 */
  autoRoadAddress: string
  /** 도로명 선택 시 자동 매핑된 지번 주소 */
  autoJibunAddress: string
  /** 건물명 */
  buildingName: string
  /** 법정동/법정리 이름 */
  bname: string
}

interface PostcodeOptions {
  oncomplete: (data: PostcodeResult) => void
  width?: string | number
  height?: string | number
  /** 검색 결과의 "지도" 버튼 숨김 (임베드 환경 권장) */
  hideMapBtn?: boolean
  /** 검색 결과의 "영문보기" 버튼 숨김 */
  hideEngBtn?: boolean
}

interface PostcodeInstance {
  embed: (element: HTMLElement, options?: { q?: string; autoClose?: boolean }) => void
}

export type PostcodeConstructor = new (options: PostcodeOptions) => PostcodeInstance

interface PostcodeWindow {
  kakao?: { Postcode?: PostcodeConstructor }
  daum?: { Postcode?: PostcodeConstructor }
}

function getPostcodeConstructor(): PostcodeConstructor | undefined {
  const w = window as unknown as PostcodeWindow
  return w.kakao?.Postcode ?? w.daum?.Postcode
}

// 스크립트는 페이지당 1회만 로드 (실패 시 초기화하여 재시도 허용)
let loadPromise: Promise<PostcodeConstructor> | null = null

export function loadPostcode(): Promise<PostcodeConstructor> {
  const existing = getPostcodeConstructor()
  if (existing) return Promise.resolve(existing)
  if (loadPromise) return loadPromise

  const script = document.createElement("script")
  const promise = new Promise<PostcodeConstructor>((resolve, reject) => {
    script.src = POSTCODE_SCRIPT_SRC
    script.async = true
    script.onload = () => {
      const Postcode = getPostcodeConstructor()
      if (Postcode) resolve(Postcode)
      else reject(new Error("우편번호 서비스를 초기화하지 못했습니다"))
    }
    script.onerror = () => reject(new Error("우편번호 서비스 스크립트를 불러오지 못했습니다"))
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    loadPromise = null
    script.remove()
    throw error
  })

  loadPromise = promise
  return promise
}

/**
 * 저장할 주소 문자열
 * - 사용자가 고른 타입(도로명/지번)을 그대로 사용, 1:N 매핑으로 비어 있으면 자동 매핑값 → 기본 주소 순
 * - 건물명/참고항목은 붙이지 않음 (지도 검색 정확도를 위해 기본 주소만 저장, 층·호수는 사용자가 직접 추가)
 */
export function getSelectedAddress(data: PostcodeResult): string {
  const selected =
    data.userSelectedType === "J"
      ? data.jibunAddress || data.autoJibunAddress
      : data.roadAddress || data.autoRoadAddress
  return (selected || data.address).trim()
}
