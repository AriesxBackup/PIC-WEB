import type { Metadata } from "next";
import { headers } from "next/headers";
import { Download } from "lucide-react";
import { Card, PageHeader, button } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { listTeam } from "@/lib/data/users";
import { AddMemberForm } from "./add-member-form";
import { MemberRow } from "./member-row";

export const metadata: Metadata = { title: "Team" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const team = listTeam();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  const siteUrl = host ? `${proto}://${host}` : "";
  const activeCount = team.filter((m) => m.active).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Team" subtitle="Only you (admins) can add people. Set their email and password, then share them." />

      <Card className="p-4 sm:p-5">
        <h2 className="mb-4 font-semibold">Add a team member</h2>
        <AddMemberForm siteUrl={siteUrl} />
      </Card>

      <Card>
        <h2 className="border-b border-border px-4 py-3 font-semibold sm:px-5">
          Members <span className="text-muted">· {activeCount} active</span>
        </h2>
        <ul className="divide-y divide-border">
          {team.map((member) => (
            <MemberRow key={member.id} member={member} isSelf={member.id === admin.id} />
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="font-semibold">Backup</h2>
          <p className="text-sm text-muted">Download the whole board (one SQLite file). Keep a copy somewhere safe.</p>
        </div>
        <a href="/api/admin/backup" className={`${button.secondary} shrink-0`} download>
          <Download className="size-4" /> Download backup
        </a>
      </Card>
    </div>
  );
}
