import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { StoreTemplatesClient } from "./components/store-templates-client"

export default async function StoreTemplatesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/?sessionExpired=true")
  }

  return <StoreTemplatesClient userId={session.user.id} userRole={session.user.role} />
}
