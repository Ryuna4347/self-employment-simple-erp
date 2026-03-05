"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CollectionHistoryItem } from "../hooks/use-collections"

interface CollectionHistoryCardProps {
  item: CollectionHistoryItem
}

export function CollectionHistoryCard({ item }: CollectionHistoryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isRequest = item.type === "request"

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* 접힌 상태 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-base truncate">
                {item.storeNameSnapshot}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0",
                  isRequest
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                )}
              >
                {isRequest ? "일괄 수금" : "직접 수금"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{item.collectedByName}</span>
              <span>·</span>
              <span>{item.collectedAt}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold text-blue-600">
              {item.totalAmount.toLocaleString()}원
            </span>
            <ChevronDown
              className={cn(
                "size-5 text-gray-400 transition-transform duration-300",
                expanded && "rotate-180"
              )}
            />
          </div>
        </div>
      </button>

      {/* 펼친 상태 */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-200 p-4">
            {/* 직접 수금 */}
            {item.type === "direct" && item.workRecord && (
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  근무일: {item.workRecord.date}
                </p>
                <div className="space-y-1">
                  {item.workRecord.items.map((ri, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700">{ri.name}</span>
                      <span className="text-gray-900 font-medium">
                        {ri.amount.toLocaleString()}원
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 일괄 수금 (요청 승인) */}
            {item.type === "request" && item.records && (
              <div className="space-y-3">
                {item.records.map((rec) => (
                  <div key={rec.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {rec.date}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          rec.totalAmount === 0
                            ? "text-gray-400"
                            : "text-gray-900"
                        )}
                      >
                        {rec.totalAmount.toLocaleString()}원
                      </span>
                    </div>
                    <div className="pl-2 space-y-0.5">
                      {rec.items.map((ri, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs text-gray-500"
                        >
                          <span>{ri.name}</span>
                          <span>{ri.amount.toLocaleString()}원</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
