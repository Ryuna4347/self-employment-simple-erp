import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { WorkRecordsClient } from "./components/work-records-client"

export default async function WorkRecordsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/?sessionExpired=true")
  }

  return <WorkRecordsClient userId={session.user.id} userRole={session.user.role} />
}
