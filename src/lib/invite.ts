/**
 * 초대 코드 관련 유틸리티 함수
 */

interface InviteData {
  name: string
  inviteCode: string
}

/**
 * 초대 데이터를 base64로 인코딩
 */
export function encodeInviteCode(name: string, inviteCode: string): string {
  const data: InviteData = { name, inviteCode }
  const json = JSON.stringify(data)
  return Buffer.from(json).toString("base64")
}

/**
 * base64 코드를 디코딩하여 초대 데이터 반환
 */
export function decodeInviteCode(code: string): InviteData | null {
  try {
    const json = Buffer.from(code, "base64").toString("utf-8")
    const data = JSON.parse(json) as InviteData
    
    if (!data.name || !data.inviteCode) {
      return null
    }
    
    return data
  } catch {
    return null
  }
}

/**
 * 랜덤 초대 코드 생성 (8자리)
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * 초대 URL 생성
 */
export function createInviteUrl(baseUrl: string, name: string, inviteCode: string): string {
  const code = encodeInviteCode(name, inviteCode)
  return `${baseUrl}/register?code=${code}`
}
