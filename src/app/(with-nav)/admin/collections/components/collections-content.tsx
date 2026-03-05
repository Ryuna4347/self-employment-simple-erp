"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { CollectionRequestsTab } from "./collection-requests-tab"
import { CollectionHistoryTab } from "./collection-history-tab"

type Tab = "requests" | "history"

export function CollectionsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = (searchParams.get("tab") as Tab) || "requests"

  const handleTabChange = (newTab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", newTab)
    router.replace(`/admin/collections?${params.toString()}`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">수금 관리</h1>
        <p className="text-gray-600 text-sm mt-1">
          수금 확인 요청 처리 및 수금 이력을 관리합니다
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => handleTabChange("requests")}
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            tab === "requests"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          수금 확인
        </button>
        <button
          onClick={() => handleTabChange("history")}
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            tab === "history"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          수금 이력
        </button>
      </div>

      {tab === "requests" ? <CollectionRequestsTab /> : <CollectionHistoryTab />}
    </div>
  )
}
