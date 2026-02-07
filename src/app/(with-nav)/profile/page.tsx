import { auth } from "@/auth";
import { ProfileContent } from "./components";

export default async function ProfilePage() {
  const session = await auth();

  // layout에서 이미 세션 검증 완료 — 타입 내로잉만 수행
  const user = session!.user;

  return <ProfileContent user={user} />;
}
