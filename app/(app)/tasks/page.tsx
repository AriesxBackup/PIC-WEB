import type { Metadata } from "next";
import Link from "next/link";
import { CompactReel } from "@/components/compact-reel";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { listOpenTasks, listRecentlyPosted } from "@/lib/data/reels";
import { cn } from "@/lib/utils";
import { TaskActions } from "./task-actions";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const user = await requireUser();
  const { who } = await searchParams;
  const everyone = who === "all";
  const assigneeId = everyone ? undefined : user.id;

  const tasks = listOpenTasks(user.id, assigneeId);
  const posted = listRecentlyPosted(user.id, assigneeId, 6);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={everyone ? "Team tasks" : "My tasks"}
        subtitle={everyone ? "Everything assigned, soonest due first." : "Reels the admin asked you to make, soonest due first."}
      />

      <div className="mb-5 inline-flex rounded-xl border border-border bg-surface p-1 text-sm font-medium">
        {[
          { href: "/tasks", label: "Mine", active: !everyone },
          { href: "/tasks?who=all", label: "Everyone", active: everyone },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center rounded-lg px-5 transition",
              tab.active ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {tasks.length ? (
        <div className="space-y-2.5">
          {tasks.map((reel) => (
            <CompactReel key={reel.id} reel={reel} showStatus>
              {reel.assignee?.id === user.id ? <TaskActions reelId={reel.id} status={reel.status} /> : null}
            </CompactReel>
          ))}
        </div>
      ) : (
        <EmptyState icon={everyone ? "🗂️" : "🎉"} title={everyone ? "Nothing assigned" : "You're all caught up"}>
          {everyone
            ? "When the admin assigns a reel to someone, it shows up here."
            : "When the admin assigns you a reel to make, it'll show up here."}
        </EmptyState>
      )}

      {posted.length ? (
        <section className="mt-10">
          <h2 className="mb-3 font-semibold">Recently posted 🚀</h2>
          <div className="space-y-2.5">
            {posted.map((reel) => (
              <CompactReel key={reel.id} reel={reel} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
