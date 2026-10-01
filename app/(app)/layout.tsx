import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { preconnect } from "react-dom";
import { KeyboardWatch } from "@/components/keyboard-watch";
import { LiveUpdates } from "@/components/live-updates";
import { AppHeader, BottomNav } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth/dal";
import { APP_NAME } from "@/lib/config";
import { countOpenTasks } from "@/lib/data/reels";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Shell only — each page also checks the session itself (layouts don't re-run on navigation).
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const openTasks = countOpenTasks(user.id);
  // Warm up connections to Instagram so the first player starts sooner.
  preconnect("https://www.instagram.com");
  preconnect("https://static.cdninstagram.com");

  return (
    <>
      <AppHeader appName={APP_NAME} user={user} openTasks={openTasks} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-5 sm:px-6 md:pb-16">{children}</main>
      <BottomNav isAdmin={user.role === "admin"} openTasks={openTasks} />
      <KeyboardWatch />
      <LiveUpdates userId={user.id} />
    </>
  );
}
