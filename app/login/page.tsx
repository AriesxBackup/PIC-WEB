import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthShell } from "@/components/auth-shell";
import { safeNextPath } from "@/lib/actions/helpers";
import { getCurrentUser } from "@/lib/auth/dal";
import { APP_NAME } from "@/lib/config";
import { countUsers } from "@/lib/data/users";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  await connection(); // always check the database at request time, never at build time
  if (countUsers() === 0) redirect("/setup");
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : "/");
  if (await getCurrentUser()) redirect(nextPath);

  return (
    <AuthShell appName={APP_NAME} title="Welcome back" subtitle="Log in to see what the team is saving.">
      <LoginForm next={nextPath} />
    </AuthShell>
  );
}
