import type { Role } from "@/generated/prisma/client"

/** ADMIN 수준 데이터 접근 가능 여부 (ADMIN, VIEWER) */
export function hasAdminAccess(role: Role): boolean {
  return role === "ADMIN" || role === "VIEWER"
}

/** 쓰기 작업 가능 여부 (VIEWER 제외) */
export function canWrite(role: Role): boolean {
  return role !== "VIEWER"
}

/** 읽기 전용 계정 여부 */
export function isViewer(role: Role): boolean {
  return role === "VIEWER"
}

/** 역할 표시명 */
export function getRoleLabel(role: Role): string {
  switch (role) {
    case "ADMIN": return "관리자"
    case "VIEWER": return "열람자"
    case "USER": return "직원"
  }
}
