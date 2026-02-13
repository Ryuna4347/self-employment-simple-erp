"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-is-mobile"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
  DialogClose,
} from "./dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "./drawer"

// ─── Context ───────────────────────────────────────────────

type MobileVariant = "sheet" | "fullscreen"

interface ResponsiveModalContextValue {
  isMobile: boolean
  mobileVariant: MobileVariant
  isSheet: boolean
  isFullscreen: boolean
}

const ResponsiveModalContext = React.createContext<ResponsiveModalContextValue>({
  isMobile: false,
  mobileVariant: "fullscreen",
  isSheet: false,
  isFullscreen: false,
})

function useResponsiveModal() {
  return React.useContext(ResponsiveModalContext)
}

// ─── Root ──────────────────────────────────────────────────

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mobileVariant?: MobileVariant
  children: React.ReactNode
}

function ResponsiveModal({
  mobileVariant = "fullscreen",
  children,
  ...props
}: ResponsiveModalProps) {
  const isMobile = useIsMobile()
  const isSheet = isMobile && mobileVariant === "sheet"
  const isFullscreen = isMobile && mobileVariant === "fullscreen"

  const contextValue = React.useMemo(
    () => ({ isMobile, mobileVariant, isSheet, isFullscreen }),
    [isMobile, mobileVariant, isSheet, isFullscreen]
  )

  return (
    <ResponsiveModalContext.Provider value={contextValue}>
      {isSheet ? (
        <Drawer {...props}>{children}</Drawer>
      ) : (
        <Dialog {...props}>{children}</Dialog>
      )}
    </ResponsiveModalContext.Provider>
  )
}

// ─── Content ───────────────────────────────────────────────

function ResponsiveModalContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogContent> & {
  showCloseButton?: boolean
}) {
  const { isSheet, isFullscreen } = useResponsiveModal()

  // 모바일 바텀시트
  if (isSheet) {
    return (
      <DrawerContent className={cn("max-h-[85vh]", className)} {...(props as Record<string, unknown>)}>
        {children}
      </DrawerContent>
    )
  }

  // 모바일 풀스크린
  if (isFullscreen) {
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            "bg-background fixed inset-0 z-50 flex flex-col gap-4 outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:slide-out-to-bottom-2",
            "duration-200"
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  }

  // 데스크톱: 기존 Dialog 그대로
  return (
    <DialogContent className={className} showCloseButton={showCloseButton} {...props}>
      {children}
    </DialogContent>
  )
}

// ─── Header ────────────────────────────────────────────────

function ResponsiveModalHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { isSheet, isFullscreen } = useResponsiveModal()

  // 모바일 바텀시트
  if (isSheet) {
    return (
      <DrawerHeader className={className} {...props}>
        {children}
      </DrawerHeader>
    )
  }

  // 모바일 풀스크린: 상단 고정 헤더 + X 닫기 버튼
  if (isFullscreen) {
    return (
      <div
        data-slot="dialog-header"
        className={cn(
          "flex items-center gap-3 px-4 py-4 border-b border-gray-200 shrink-0",
          className
        )}
        {...props}
      >
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring rounded-md p-1 -ml-1 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden">
          <XIcon className="size-5" />
          <span className="sr-only">닫기</span>
        </DialogPrimitive.Close>
        <div className="flex-1 flex flex-col gap-1">{children}</div>
      </div>
    )
  }

  // 데스크톱
  return (
    <DialogHeader className={className} {...props}>
      {children}
    </DialogHeader>
  )
}

// ─── Title ─────────────────────────────────────────────────

function ResponsiveModalTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const { isSheet } = useResponsiveModal()

  if (isSheet) {
    return <DrawerTitle className={className} {...props} />
  }

  return <DialogTitle className={className} {...props} />
}

// ─── Description ───────────────────────────────────────────

function ResponsiveModalDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const { isSheet } = useResponsiveModal()

  if (isSheet) {
    return <DrawerDescription className={className} {...props} />
  }

  return <DialogDescription className={className} {...props} />
}

// ─── Footer ────────────────────────────────────────────────

function ResponsiveModalFooter({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { isSheet, isFullscreen } = useResponsiveModal()

  // 모바일 바텀시트
  if (isSheet) {
    return (
      <DrawerFooter className={className} {...props}>
        {children}
      </DrawerFooter>
    )
  }

  // 모바일 풀스크린: 하단 고정 푸터
  if (isFullscreen) {
    return (
      <div
        data-slot="dialog-footer"
        className={cn(
          "flex flex-col-reverse gap-2 px-4 py-3 border-t border-gray-200 shrink-0 bg-background",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  // 데스크톱
  return (
    <DialogFooter className={className} {...props}>
      {children}
    </DialogFooter>
  )
}

// ─── Close ─────────────────────────────────────────────────

function ResponsiveModalClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const { isSheet } = useResponsiveModal()

  if (isSheet) {
    return <DrawerClose {...props} />
  }

  return <DialogClose {...props} />
}

export {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalClose,
}
