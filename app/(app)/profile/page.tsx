import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";

export default async function ProfileIndexPage() {
  const user = await requireUser();
  redirect(`/profile/${user.id}`);
}
