import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 사업자등록번호 표시용 포맷터.
 * 정확히 10자리 숫자일 때만 xxx-xx-xxxxx 형식으로 반환합니다.
 */
export function formatBizNo(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{10}$/.test(value)) {
    return `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5)}`;
  }
  return value;
}

/**
 * 사업자등록번호 입력 표시용 포맷터.
 * form value는 raw 숫자 문자열로 유지하고 화면 표시값에만 사용합니다.
 */
export function formatBizNoInput(rawDigits: string): string {
  const digits = rawDigits.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/**
 * Base64 디코딩 (UTF-8 지원)
 * atob은 Latin-1만 지원하므로 한글 등 유니코드 문자가 깨지는 문제를 해결
 */
export function decodeBase64(str: string): string {
  return decodeURIComponent(
    atob(str)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  );
}
