import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthShell } from "@/components/auth-shell";
import { isSetupAllowed } from "@/lib/auth/setup-token";
import { APP_NAME } from "@/lib/config";
import { countUsers } from "@/lib/data/users";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up" };

// Only reachable while the database has no users: creates the first admin.
export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  await connection(); // always check the database at request time, never at build time
  if ((await countUsers()) > 0) redirect("/login");

  const { token } = await searchParams;
  if (!isSetupAllowed(token)) {
    return (
      <AuthShell appName={APP_NAME} title="Almost ready" subtitle="This site hasn't been set up yet.">
        <p className="text-sm text-muted">
          Open the setup link that includes the setup token (<code>/setup?token=…</code>). If you installed this
          site, the token is the <code>SETUP_TOKEN</code> value in your settings.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      appName={APP_NAME}
      title="Create the admin account"
      subtitle="You'll be the team admin. You can add everyone else after this."
    >
      <SetupForm token={typeof token === "string" ? token : ""} />
    </AuthShell>
  );
}
