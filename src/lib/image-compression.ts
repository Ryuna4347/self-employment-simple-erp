/**
 * 업로드 전 클라이언트 이미지 압축
 *
 * 휴대폰 원본 사진(수 MB)을 그대로 올리면 모바일 네트워크에서 업로드가 수 초 걸리고,
 * 목록에서 볼 때도 원본을 내려받게 된다. 긴 변을 MAX_DIMENSION 이하로 줄이고 JPEG로
 * 다시 인코딩해 보통 수백 KB 수준으로 낮춘다. (재인코딩 과정에서 EXIF 촬영 위치 등 메타데이터도 제거된다)
 */

// 긴 변 최대 픽셀 (근무기록 첨부 이미지는 카드에서 최대 높이 192px로 표시되며, 원본 보기에도 충분한 크기)
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.8
// 이미 충분히 작은 이미지는 다시 인코딩하지 않는다 (불필요한 화질 저하 방지)
const SKIP_BELOW_BYTES = 300 * 1024

/**
 * 이미지 파일을 리사이즈·재압축한다.
 *
 * 압축이 불가능하거나(디코딩/인코딩 실패) 결과가 원본보다 크면 원본을 그대로 반환한다.
 * 결과 파일은 `image/jpeg` 타입과 `.jpg` 확장자를 갖는다 (업로드 API가 파일명에서 확장자를 읽음).
 */
export async function compressImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file

  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    // 최신 브라우저는 EXIF 회전 정보를 반영한 크기를 naturalWidth/Height로 돌려주고 그리기에도 반영한다
    const { naturalWidth: width, naturalHeight: height } = image
    if (width === 0 || height === 0) return file

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return file

    const canvas = document.createElement("canvas")
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext("2d")
    if (!context) return file

    // PNG의 투명 영역이 JPEG 변환 시 검게 칠해지지 않도록 흰 배경을 먼저 채운다
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    )
    // 인코딩 실패, JPEG 미지원(다른 형식으로 대체됨), 오히려 커진 경우 원본 유지
    if (!blob || blob.type !== "image/jpeg" || blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^./]+$/, "") || "image"
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("이미지를 불러올 수 없습니다"))
    image.src = src
  })
}
