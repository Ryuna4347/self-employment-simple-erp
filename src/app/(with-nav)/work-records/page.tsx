import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isViewer } from "@/lib/role-utils"
import { WorkRecordsClient } from "./components/work-records-client"

export default async function WorkRecordsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/?sessionExpired=true")
  }

  // 읽기 전용 계정(VIEWER)은 관리자 대시보드로 리다이렉트
  // 로그인 직후에도 이 경로를 통해 관리자 대시보드로 이동한다
  if (isViewer(session.user.role)) {
    redirect("/admin/dashboard")
  }

  return <WorkRecordsClient userId={session.user.id} userRole={session.user.role} />
}
