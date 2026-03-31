import { getSessionFromJWT } from "@/lib/get-session"
import { redirect } from "next/navigation"
import { StoreTemplatesClient } from "./components/store-templates-client"

export default async function StoreTemplatesPage() {
  const session = await getSessionFromJWT()

  if (!session?.user) {
    redirect("/?sessionExpired=true")
  }

  return <StoreTemplatesClient userId={session.user.id} userRole={session.user.role} />
}
