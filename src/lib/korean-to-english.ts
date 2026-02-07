/**
 * 한글 → 영문 자판 변환 유틸리티
 * 두벌식 한글 입력을 QWERTY 영문 키 매핑으로 변환
 */

// 호환 자모 (ㄱ-ㅎ, ㅏ-ㅣ) → 영문 키
const COMPAT_JAMO_MAP: Record<string, string> = {
  // 자음
  ㄱ: "r", ㄲ: "R", ㄳ: "rt", ㄴ: "s", ㄵ: "sw", ㄶ: "sg",
  ㄷ: "e", ㄸ: "E", ㄹ: "f", ㄺ: "fr", ㄻ: "fa", ㄼ: "fq",
  ㄽ: "ft", ㄾ: "fx", ㄿ: "fv", ㅀ: "fg", ㅁ: "a", ㅂ: "q",
  ㅃ: "Q", ㅄ: "qt", ㅅ: "t", ㅆ: "T", ㅇ: "d", ㅈ: "w",
  ㅉ: "W", ㅊ: "c", ㅋ: "z", ㅌ: "x", ㅍ: "v", ㅎ: "g",
  // 모음
  ㅏ: "k", ㅐ: "o", ㅑ: "i", ㅒ: "O", ㅓ: "j", ㅔ: "p",
  ㅕ: "u", ㅖ: "P", ㅗ: "h", ㅘ: "hk", ㅙ: "ho", ㅚ: "hl",
  ㅛ: "y", ㅜ: "n", ㅝ: "nj", ㅞ: "np", ㅟ: "nl", ㅠ: "b",
  ㅡ: "m", ㅢ: "ml", ㅣ: "l",
}

// 초성 (19개) → 영문 키
const CHOSEONG: string[] = [
  "r", "R", "s", "e", "E", "f", "a", "q", "Q", "t",
  "T", "d", "w", "W", "c", "z", "x", "v", "g",
]

// 중성 (21개) → 영문 키
const JUNGSEONG: string[] = [
  "k", "o", "i", "O", "j", "p", "u", "P", "h", "hk",
  "ho", "hl", "y", "n", "nj", "np", "nl", "b", "m", "ml", "l",
]

// 종성 (28개, 0번은 없음) → 영문 키
const JONGSEONG: string[] = [
  "", "r", "R", "rt", "s", "sw", "sg", "e", "f", "fr",
  "fa", "fq", "ft", "fx", "fv", "fg", "a", "q", "qt", "t",
  "T", "d", "w", "c", "z", "x", "v", "g",
]

/**
 * 한글 문자열을 영문 자판 매핑으로 변환
 * 예: "ㄱ" → "r", "가" → "rk", "한글" → "gksrmf"
 */
export function koreanToEnglish(text: string): string {
  let result = ""

  for (const char of text) {
    const code = char.charCodeAt(0)

    // 완성형 한글 음절 (가-힣)
    if (code >= 0xac00 && code <= 0xd7a3) {
      const syllableIndex = code - 0xac00
      const cho = Math.floor(syllableIndex / (21 * 28))
      const jung = Math.floor((syllableIndex % (21 * 28)) / 28)
      const jong = syllableIndex % 28

      result += CHOSEONG[cho] + JUNGSEONG[jung] + JONGSEONG[jong]
    }
    // 호환 자모 (ㄱ-ㅣ)
    else if (COMPAT_JAMO_MAP[char]) {
      result += COMPAT_JAMO_MAP[char]
    }
    // 그 외 문자 (영문, 숫자, 특수문자 등) 그대로 유지
    else {
      result += char
    }
  }

  return result
}
