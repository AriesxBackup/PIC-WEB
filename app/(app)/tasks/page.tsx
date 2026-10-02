import type { Metadata } from "next";
import { CompactReel } from "@/components/compact-reel";
import { Reveal } from "@/components/motion";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { listOpenTasks, listRecentlyPosted } from "@/lib/data/reels";
import { SegmentedTabs } from "./segmented-tabs";
import { TaskActions } from "./task-actions";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const user = await requireUser();
  const { who } = await searchParams;
  const everyone = who === "all";
  const assigneeId = everyone ? undefined : user.id;

  const tasks = await listOpenTasks(user.id, assigneeId);
  const posted = await listRecentlyPosted(user.id, assigneeId, 6);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={everyone ? "Team tasks" : "My tasks"}
        subtitle={everyone ? "Everything assigned, soonest due first." : "Reels the admin asked you to make, soonest due first."}
      />

      <div className="mb-5">
        <SegmentedTabs active={everyone ? "everyone" : "mine"} />
      </div>

      {tasks.length ? (
        <div className="space-y-2.5">
          {tasks.map((reel, index) => (
            <Reveal key={reel.id} delay={Math.min(index * 0.06, 0.45)}>
              <CompactReel reel={reel} showStatus>
                {reel.assignee?.id === user.id ? <TaskActions reelId={reel.id} status={reel.status} /> : null}
              </CompactReel>
            </Reveal>
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
            {posted.map((reel, index) => (
              <Reveal key={reel.id} inView delay={Math.min(index * 0.06, 0.3)}>
                <CompactReel reel={reel} />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
