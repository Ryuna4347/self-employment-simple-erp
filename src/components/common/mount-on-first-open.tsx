"use client"

import { useState, type ReactNode } from "react"

interface MountOnFirstOpenProps {
  /** 모달 열림 여부 */
  open: boolean
  children: ReactNode
}

/**
 * 모달을 처음 열 때까지 마운트를 미룬다.
 *
 * - 첫 오픈 전: children(모달)을 렌더링하지 않으므로 모달 안의 쿼리가 실행되지 않고,
 *   next/dynamic으로 분리한 모달이면 코드 청크도 내려받지 않는다.
 * - 첫 오픈 후: 닫혀도 마운트를 유지해 닫힘 애니메이션과 모달 내부 상태를 보존한다.
 *
 * 주의: 감싸는 모달은 `open=true` 상태로 처음 마운트되어도 올바르게 초기화되어야 한다
 * (열림 시 초기화는 `open` 의존 effect로 처리하고, 마운트 시점에 상태를 지우는 effect를 두지 않는다).
 *
 * @example
 * <MountOnFirstOpen open={isOpen}>
 *   <SomeModal open={isOpen} onOpenChange={setIsOpen} />
 * </MountOnFirstOpen>
 */
export function MountOnFirstOpen({ open, children }: MountOnFirstOpenProps) {
  const [hasOpened, setHasOpened] = useState(open)

  // 렌더 중 상태 조정 패턴: effect 없이 첫 오픈 시점을 기록한다
  if (open && !hasOpened) {
    setHasOpened(true)
  }

  return open || hasOpened ? children : null
}
