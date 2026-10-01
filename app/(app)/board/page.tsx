import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CompactReel } from "@/components/compact-reel";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import type { Status } from "@/lib/constants";
import { listBoard } from "@/lib/data/reels";

export const metadata: Metadata = { title: "Board" };

const COLUMNS: { status: Status; hint: string }[] = [
  { status: "new", hint: "Fresh ideas waiting for the admin" },
  { status: "approved", hint: "Green-lit — needs someone to make it" },
  { status: "in_production", hint: "Being shot or edited" },
  { status: "posted", hint: "Live on our account" },
];
const COLUMN_LIMIT = 40;

export default async function BoardPage() {
  const user = await requireUser();
  const board = listBoard(user.id);

  return (
    <>
      <PageHeader title="Production board" subtitle="Every idea from first save to posted. Open one to move it along." />

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {COLUMNS.map(({ status, hint }) => {
          const reels = board[status];
          return (
            <section key={status} className="w-[82vw] max-w-xs shrink-0 snap-start lg:w-auto lg:max-w-none">
              <div className="mb-3 space-y-1">
                <h2 className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  <span className="text-sm font-semibold tabular-nums text-muted">{reels.length}</span>
                </h2>
                <p className="text-xs text-muted">{hint}</p>
              </div>
              <div className="space-y-2.5">
                {reels.length ? (
                  reels.slice(0, COLUMN_LIMIT).map((reel) => <CompactReel key={reel.id} reel={reel} />)
                ) : (
                  <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                    Nothing here yet
                  </p>
                )}
                {reels.length > COLUMN_LIMIT ? (
                  <Link href={`/?status=${status}`} className="flex min-h-11 items-center justify-center text-sm font-medium text-muted hover:text-fg">
                    See all {reels.length} →
                  </Link>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {board.skipped.length ? (
        <details className="group mt-6">
          <summary className="flex min-h-11 cursor-pointer list-none select-none items-center gap-2 text-sm font-medium text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 transition group-open:rotate-90" aria-hidden />
            ⏭️ Skipped ideas ({board.skipped.length})
          </summary>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {board.skipped.slice(0, COLUMN_LIMIT).map((reel) => (
              <CompactReel key={reel.id} reel={reel} />
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}
