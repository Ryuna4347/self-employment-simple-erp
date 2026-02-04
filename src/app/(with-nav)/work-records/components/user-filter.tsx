"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUsers } from "../hooks/use-users"
import { Users } from "lucide-react"

interface UserFilterProps {
  selectedUserId: string
  onUserChange: (userId: string) => void
  currentUserId: string
}

export function UserFilter({ selectedUserId, onUserChange, currentUserId }: UserFilterProps) {
  const { data: users, isLoading } = useUsers()

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Users className="size-4" />
          <span>로딩 중...</span>
        </div>
      </div>
    )
  }

  const currentUser = users?.find((u) => u.id === currentUserId)
  const currentUserName = currentUser?.name || "나"

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Users className="size-4 text-gray-500" />
        <Select value={selectedUserId} onValueChange={onUserChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="담당자 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value={currentUserId}>{currentUserName} (나)</SelectItem>
            {users?.filter((u) => u.id !== currentUserId).map((user) => (
              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
