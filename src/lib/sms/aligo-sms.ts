export interface SmsSendResult {
  resultCode: number
  message: string
  msgId?: string
}

interface AligoSmsResponse {
  result_code?: unknown
  message?: unknown
  msg_id?: unknown
}

const ALIGO_SMS_URL = "https://apis.aligo.in/send/"
const MAX_SMS_BYTES = 90
const MAX_LMS_BYTES = 2000

function byteLength(value: string): number {
  let length = 0
  for (const char of value) {
    length += /[^\x00-\x7F]/.test(char) ? 2 : 1
  }
  return length
}

function truncateByBytes(value: string, maxBytes: number): string {
  let length = 0
  let result = ""

  for (const char of value) {
    const charLength = /[^\x00-\x7F]/.test(char) ? 2 : 1
    if (length + charLength > maxBytes) break
    result += char
    length += charLength
  }

  return result
}

function getDefaultTitle(message: string): string {
  const firstLine = message.split("\n")[0] ?? ""
  return truncateByBytes(firstLine, 30)
}

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Aligo 환경변수가 누락되었습니다: ${key}`)
  }
  return value
}

function getRequiredEnv() {
  const keys = ["ALIGO_API_KEY", "ALIGO_USER_ID", "ALIGO_SENDER"] as const
  const missing = keys
    .map((key) => [key, process.env[key]] as const)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Aligo 환경변수가 누락되었습니다: ${missing.join(", ")}`)
  }

  return {
    apiKey: requireEnv("ALIGO_API_KEY"),
    userId: requireEnv("ALIGO_USER_ID"),
    sender: requireEnv("ALIGO_SENDER"),
  }
}

function parseAligoSmsResponse(data: unknown): SmsSendResult {
  const response: AligoSmsResponse =
    typeof data === "object" && data !== null ? (data as AligoSmsResponse) : {}
  const resultCode =
    typeof response.result_code === "number"
      ? response.result_code
      : Number(response.result_code ?? -1)
  const message =
    typeof response.message === "string"
      ? response.message
      : String(response.message ?? "")
  const msgId = typeof response.msg_id === "string" ? response.msg_id : undefined

  return { resultCode, message, ...(msgId && { msgId }) }
}

export async function sendAligoSms(params: {
  receivers: string[]
  message: string
  title?: string
}): Promise<SmsSendResult> {
  const { receivers, title } = params

  if (receivers.length === 0) {
    throw new Error("수신자가 비어있습니다")
  }

  const env = getRequiredEnv()
  const originalByteLength = byteLength(params.message)
  const message =
    originalByteLength > MAX_LMS_BYTES
      ? truncateByBytes(params.message, MAX_LMS_BYTES)
      : params.message
  const msgType = byteLength(message) <= MAX_SMS_BYTES ? "SMS" : "LMS"

  if (originalByteLength > MAX_LMS_BYTES) {
    console.warn("[SMS] 본문이 2000바이트를 초과해 잘랐습니다")
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[SMS DEV_MOCK]", { receivers, msgType, message })
    return { resultCode: 1, message: "DEV_MOCK" }
  }

  try {
    const body = new URLSearchParams({
      key: env.apiKey,
      user_id: env.userId,
      sender: env.sender,
      receiver: receivers.join(","),
      msg: message,
      msg_type: msgType,
      testmode_yn: process.env.ALIGO_TEST_MODE ?? "N",
    })

    if (msgType === "LMS") {
      body.set("title", title ?? getDefaultTitle(message))
    }

    const response = await fetch(ALIGO_SMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
    const data: unknown = await response.json()

    return parseAligoSmsResponse(data)
  } catch (error) {
    return {
      resultCode: -1,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
