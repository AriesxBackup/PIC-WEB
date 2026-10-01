import { X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { TimeAgo } from "@/components/clock";
import { ConfirmButton } from "@/components/form-controls";
import { deleteCommentAction } from "@/lib/actions/comments";
import type { SessionUser } from "@/lib/auth/session";
import type { CommentItem } from "@/lib/data/comments";
import { CommentForm } from "./comment-form";

export function Discussion({ reelId, comments, me }: { reelId: number; comments: CommentItem[]; me: SessionUser }) {
  const count = comments.filter((c) => c.kind === "comment").length;

  return (
    <section id="discussion" className="scroll-mt-20 space-y-4">
      <h2 className="font-semibold">
        Discussion {count ? <span className="text-muted">· {count}</span> : null}
      </h2>

      {comments.length ? (
        <ol className="space-y-3">
          {comments.map((comment) => {
            const name = comment.author?.name ?? "Former member";
            const canDelete = me.role === "admin" || (comment.kind === "comment" && comment.author?.id === me.id);

            if (comment.kind === "event") {
              return (
                <li key={comment.id} className="flex items-center gap-2 pl-1 text-xs text-muted">
                  <Avatar person={comment.author} size="xs" className="ring-0" />
                  <span className="min-w-0">
                    <b className="font-semibold text-fg/80">{name}</b> {comment.body} · <TimeAgo time={comment.createdAt} />
                  </span>
                </li>
              );
            }

            return (
              <li key={comment.id} className="group flex gap-2.5">
                <Avatar person={comment.author} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-surface-2 px-3.5 py-2.5">
                  <p className="flex items-baseline gap-2 text-sm">
                    <b className="font-semibold">{name}</b>
                    <TimeAgo time={comment.createdAt} className="text-xs text-muted" />
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-[15px] leading-relaxed [overflow-wrap:anywhere]">{comment.body}</p>
                </div>
                {canDelete ? (
                  <ConfirmButton
                    action={deleteCommentAction.bind(null, comment.id)}
                    variant="ghost"
                    confirmLabel="Delete?"
                    className="self-start px-2 text-xs opacity-60 group-hover:opacity-100"
                  >
                    <X className="size-4" />
                    <span className="sr-only">Delete comment</span>
                  </ConfirmButton>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted">No comments yet. Got a twist on this idea? Say it here.</p>
      )}

      <CommentForm reelId={reelId} me={{ id: me.id, name: me.name }} />
    </section>
  );
}
