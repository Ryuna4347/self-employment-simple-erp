import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
