"use client"

import { useState } from "react"

interface InviteResult {
  userId: string
  name: string
  inviteCode: string
  inviteUrl: string
}

export default function CreateInvitePage() {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<InviteResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/admin/create-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
        setName("")
      } else {
        setError(data.message)
      }
    } catch {
      setError("요청 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("복사되었습니다!")
  }

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "24px" }}>초대 링크 생성 (테스트)</h1>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="name" style={{ display: "block", marginBottom: "8px" }}>
            사용자명
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="초대할 사용자 이름 입력"
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            backgroundColor: loading ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "생성 중..." : "초대 링크 생성"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: "20px", padding: "16px", backgroundColor: "#fee", borderRadius: "4px", color: "#c00" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "#f0f9ff", borderRadius: "8px" }}>
          <h3 style={{ marginBottom: "16px" }}>✅ 초대 생성 완료</h3>
          
          <div style={{ marginBottom: "12px" }}>
            <strong>사용자명:</strong> {result.name}
          </div>
          
          <div style={{ marginBottom: "12px" }}>
            <strong>초대 코드:</strong> {result.inviteCode}
          </div>
          
          <div style={{ marginBottom: "12px" }}>
            <strong>초대 URL:</strong>
            <div style={{ 
              marginTop: "8px", 
              padding: "12px", 
              backgroundColor: "#fff", 
              borderRadius: "4px",
              wordBreak: "break-all",
              fontSize: "14px"
            }}>
              {result.inviteUrl}
            </div>
            <button
              onClick={() => copyToClipboard(result.inviteUrl)}
              style={{
                marginTop: "8px",
                padding: "8px 16px",
                fontSize: "14px",
                backgroundColor: "#333",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              URL 복사
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
