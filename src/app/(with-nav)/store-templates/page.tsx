import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { StoreTemplatesClient } from "./components/store-templates-client"

export default async function StoreTemplatesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/?sessionExpired=true")
  }

  return <StoreTemplatesClient userRole={session.user.role} />
}
