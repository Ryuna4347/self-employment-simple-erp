import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Base64 디코딩 (UTF-8 지원)
 * atob는 Latin-1만 지원하므로 한글 등 유니코드 문자가 깨지는 문제를 해결
 */
export function decodeBase64(str: string): string {
  return decodeURIComponent(
    atob(str)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  );
}

/**
 * 숫자를 천단위 콤마 문자열로 변환 (예: 1500000 → "1,500,000")
 */
export function formatNumber(value: number): string {
  return value.toLocaleString("ko-KR");
}

/**
 * 콤마가 포함된 입력 문자열에서 숫자만 추출 (예: "1,500,000원" → 1500000)
 * 빈 문자열이거나 숫자가 없으면 0을 반환한다.
 */
export function parseNumber(input: string): number {
  const digits = input.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}
