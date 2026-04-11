import { NextRequest } from "next/server"
import { requireWriteAccess, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { getSupabase, STORAGE_BUCKET } from "@/lib/supabase"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export async function POST(request: NextRequest) {
  const authResult = await requireWriteAccess()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return ApiErrors.validationError("유효한 FormData 형식이 아닙니다")
  }

  const file = formData.get("file") as File | null
  if (!file) {
    return ApiErrors.validationError("파일이 필요합니다")
  }

  // 파일 타입 검증
  if (!ALLOWED_TYPES.includes(file.type)) {
    return ApiErrors.validationError("JPEG, PNG, WebP 이미지만 업로드할 수 있습니다")
  }

  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return ApiErrors.validationError("파일 크기는 5MB 이하여야 합니다")
  }

  // 파일명 생성
  const ext = file.name.split(".").pop() ?? "jpg"
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const filePath = `work-records/${user.id}/${timestamp}-${random}.${ext}`

  // Supabase Storage에 업로드
  const supabase = getSupabase()
  const arrayBuffer = await file.arrayBuffer()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error("이미지 업로드 오류:", error)
    return ApiErrors.internalError("이미지 업로드에 실패했습니다")
  }

  // Public URL 생성
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath)

  return apiSuccess({ url: urlData.publicUrl }, 201)
}
