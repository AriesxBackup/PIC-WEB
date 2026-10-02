"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { DueBadge } from "@/components/clock";
import { SubmitButton } from "@/components/form-controls";
import { StatusBadge } from "@/components/status-badge";
import { Card, FormMessage, input } from "@/components/ui";
import { assignAction, setStatusAction } from "@/lib/actions/reels";
import { ASSIGNEE_STATUSES, STATUSES, STATUS_META, type Status } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Person = { id: number; name: string };

export function ProductionPanel({
  reelId,
  status,
  assignee,
  dueDate,
  isAdmin,
  isAssignee,
  people,
}: {
  reelId: number;
  status: Status;
  assignee: Person | null;
  dueDate: string | null;
  isAdmin: boolean;
  isAssignee: boolean;
  people: Person[];
}) {
  const [pending, startTransition] = useTransition();
  const [assignState, assignFormAction] = useActionState(assignAction.bind(null, reelId), undefined);

  const choices: readonly Status[] = isAdmin ? STATUSES : isAssignee && status !== "skipped" ? ASSIGNEE_STATUSES : [];

  function changeStatus(next: Status) {
    startTransition(async () => {
      const result = await setStatusAction(reelId, next);
      if (result.error) toast.error(result.error);
      else toast.success(`Moved to ${STATUS_META[next].label} ${STATUS_META[next].emoji}`);
    });
  }

  return (
    <Card className="space-y-5 p-4 sm:p-5">
      <h2 className="font-semibold">Production</h2>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">Status</p>
        {choices.length ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Change status">
            {choices.map((option) => {
              const meta = STATUS_META[option];
              const current = option === status;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={pending || current}
                  aria-pressed={current}
                  onClick={() => changeStatus(option)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium ring-1 ring-inset transition duration-200 ease-brand active:scale-[0.96]",
                    current
                      ? cn(meta.className, "shadow-[0_0_20px_-6px_rgb(5_138_94/0.45)] ring-2")
                      : "text-muted ring-border hover:bg-surface-2 hover:text-fg",
                    pending && !current && "opacity-60",
                  )}
                >
                  <span aria-hidden>{meta.emoji}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            <StatusBadge status={status} />
            <p className="text-xs text-muted">The admin approves ideas and picks who makes them.</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">Who&apos;s making it</p>
        {isAdmin ? (
          // Keyed on the saved values: a <select> only reads defaultValue on mount, so remount when they change.
          <form key={`${assignee?.id ?? ""}|${dueDate ?? ""}`} action={assignFormAction} className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <select
                name="assigneeId"
                defaultValue={assignee ? String(assignee.id) : ""}
                aria-label="Assign to"
                className={cn(input, "cursor-pointer")}
              >
                <option value="">Nobody yet</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <input type="date" name="dueDate" defaultValue={dueDate ?? ""} aria-label="Due date" className={input} />
              <SubmitButton variant="secondary">Save</SubmitButton>
            </div>
            <FormMessage error={assignState?.error ?? assignState?.fields?.assigneeId ?? assignState?.fields?.dueDate} />
          </form>
        ) : assignee ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Avatar person={assignee} size="sm" className="ring-0" />
            <span className="font-medium">{isAssignee ? "You" : assignee.name}</span>
            {dueDate ? <DueBadge date={dueDate} done={status === "posted"} /> : null}
          </p>
        ) : (
          <p className="text-sm text-muted">Nobody yet.</p>
        )}
      </div>
    </Card>
  );
}
