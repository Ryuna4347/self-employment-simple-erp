import { getSessionFromJWT } from "@/lib/get-session"
import { redirect } from "next/navigation"
import { WorkRecordsClient } from "./components/work-records-client"

export default async function WorkRecordsPage() {
  const session = await getSessionFromJWT()

  if (!session?.user) {
    redirect("/?sessionExpired=true")
  }

  return <WorkRecordsClient userId={session.user.id} userRole={session.user.role} />
}
