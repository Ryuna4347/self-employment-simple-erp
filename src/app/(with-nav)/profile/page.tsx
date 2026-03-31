import { getSessionFromJWT } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { ProfileContent } from "./components";

export default async function ProfilePage() {
  const session = await getSessionFromJWT();

  if (!session?.user) {
    redirect("/?sessionExpired=true");
  }

  return <ProfileContent user={session.user} />;
}
