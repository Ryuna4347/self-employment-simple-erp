"use client"

import React from "react"
import { ImagePlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface WorkRecordImageSectionProps {
  imagePreview: string | null
  /** 부모가 소유한 input ref — 업로드 상태가 submit 흐름과 결합되어 있어 부모에 유지 */
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onSelectFile: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
}

/**
 * 근무기록 모달의 이미지 첨부 섹션 (휴업&폐업일 때만 노출) — 표시 전용
 */
export function WorkRecordImageSection({
  imagePreview,
  fileInputRef,
  onSelectFile,
  onRemove,
}: WorkRecordImageSectionProps) {
  return (
    <div className="space-y-2">
      <Label>이미지 첨부</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onSelectFile}
        className="hidden"
      />
      {imagePreview ? (
        <div className="relative">
          <img
            src={imagePreview}
            alt="첨부 이미지"
            className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            onClick={onRemove}
            className="absolute top-2 right-2"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
        >
          <ImagePlus className="size-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">클릭하여 이미지 첨부</p>
          <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP / 최대 5MB</p>
        </button>
      )}
    </div>
  )
}
