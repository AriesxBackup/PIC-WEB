import type { Metadata } from "next";
import { headers } from "next/headers";
import { Download } from "lucide-react";
import { Card, PageHeader, button } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { requireAdmin } from "@/lib/auth/dal";
import { DATABASE_LABEL } from "@/lib/config";
import { listTeam } from "@/lib/data/users";
import { AddMemberForm } from "./add-member-form";
import { MemberRow } from "./member-row";

export const metadata: Metadata = { title: "Team" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const team = await listTeam();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  const siteUrl = host ? `${proto}://${host}` : "";
  const activeCount = team.filter((m) => m.active).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Team" subtitle="Only you (admins) can add people. Set their email and password, then share them." />

      <Reveal delay={0}>
        <Card className="p-4 sm:p-5">
          <h2 className="mb-4 font-semibold tracking-tight">Add a team member</h2>
          <AddMemberForm siteUrl={siteUrl} />
        </Card>
      </Reveal>

      <Reveal delay={0.07}>
        <Card>
          <h2 className="hairline relative px-4 py-3 font-semibold tracking-tight sm:px-5">
            Members <span className="text-muted">· {activeCount} active</span>
          </h2>
          <ul className="divide-y divide-border">
            {team.map((member) => (
              <MemberRow key={member.id} member={member} isSelf={member.id === admin.id} />
            ))}
          </ul>
        </Card>
      </Reveal>

      <Reveal delay={0.14}>
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-semibold tracking-tight">Backup</h2>
            <p className="text-sm text-muted">Download the whole board as one file. Keep a copy somewhere safe.</p>
            <p className="mt-1 text-xs text-muted">
              Stored in: <span className="font-medium text-fg">{DATABASE_LABEL}</span>
            </p>
          </div>
          <a href="/api/admin/backup" className={`${button.secondary} shrink-0`} download>
            <Download className="size-4" /> Download backup
          </a>
        </Card>
      </Reveal>
    </div>
  );
}
