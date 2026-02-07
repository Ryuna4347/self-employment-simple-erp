"use client"

import { UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { StaffMember } from "../hooks/use-staff"

interface StaffCardProps {
  member: StaffMember
  onRemove: (member: StaffMember) => void
}

export function StaffCard({ member, onRemove }: StaffCardProps) {
  const isAdmin = member.role === "ADMIN"

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all p-4">
      <div className="flex items-center justify-between gap-3">
        {/* 좌측: 직원 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base">
              {member.name}
            </h3>
            {isAdmin && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                관리자
              </span>
            )}
            {member.isRegistered ? (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                등록 완료
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                초대 대기중
              </span>
            )}
          </div>
          {member.loginId && (
            <p className="text-sm text-gray-500">{member.loginId}</p>
          )}
        </div>

        {/* 우측: 삭제 버튼 (관리자가 아닌 경우만) */}
        {!isAdmin && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(member)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
            aria-label={`${member.name} 삭제`}
          >
            <UserX className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
