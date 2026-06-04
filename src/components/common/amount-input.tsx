"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { formatNumber, parseNumber } from "@/lib/utils"

type AmountInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> & {
  /** 숫자 값 (react-hook-form 의 field.value 와 동일하게 number 를 사용) */
  value: number | null | undefined
  /** 파싱된 숫자 값을 전달 (field.onChange 와 호환) */
  onChange: (value: number) => void
}

/**
 * 금액 입력 컴포넌트.
 *
 * 표시값은 천단위 콤마(`1,500,000`)로 포맷하고, 외부에는 항상 숫자(number)를 전달한다.
 * `<input type="number">` 는 콤마를 표시할 수 없으므로 `type="text" + inputMode="numeric"` 를 사용한다.
 * 표시 문자열을 value 에서 파생하므로 별도의 내부 상태가 없어 desync 가 발생하지 않는다.
 *
 * react-hook-form 에서는 `<Controller>` 의 render 안에서 사용한다:
 * ```tsx
 * <Controller control={control} name="amount" render={({ field }) => (
 *   <AmountInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
 * )} />
 * ```
 */
export function AmountInput({ value, onChange, ...props }: AmountInputProps) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={value ? formatNumber(value) : ""}
      onChange={(e) => onChange(parseNumber(e.target.value))}
      {...props}
    />
  )
}
