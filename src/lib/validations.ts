import { z } from "zod"

/**
 * 사업자등록번호. 하이픈 등 숫자가 아닌 문자는 제거하고, 빈 값은 null로 저장한다.
 */
export const bizNoSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    if (value === null) return null
    const cleaned = value.replace(/[^0-9]/g, "")
    return cleaned === "" ? null : cleaned
  })
  .refine((value) => value === undefined || value === null || /^\d{10}$/.test(value), {
    message: "사업자등록번호는 10자리 숫자여야 합니다",
  })

/**
 * 세금계산서 발급 대상 여부.
 */
export const taxInvoiceEnabledSchema = z.boolean().optional()

/**
 * 비밀번호 유효성 검사 스키마
 * - 최소 8자
 * - 영문 + 숫자 + 특수문자(@$!%*?&) 포함
 */
export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자리 이상 입력해야합니다.")
  .regex(
    /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    "비밀번호는 영문+숫자+특수문자 포함 8자리 이상 입력해야합니다.",
  )
