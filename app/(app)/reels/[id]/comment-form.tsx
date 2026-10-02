"use client";

import { useActionState } from "react";
import { SendHorizontal } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/form-controls";
import { input } from "@/components/ui";
import { addCommentAction } from "@/lib/actions/comments";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function CommentForm({ reelId, me }: { reelId: number; me: { id: number; name: string } }) {
  const [state, action] = useActionState(addCommentAction.bind(null, reelId), undefined);
  const error = state?.error ?? state?.fields?.body;

  return (
    <form action={action} className="flex gap-2.5">
      <Avatar person={me} size="sm" className="mt-1.5" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-end gap-2">
          <textarea
            name="body"
            rows={2}
            maxLength={MAX_COMMENT_LENGTH}
            required
            defaultValue={state?.values?.body}
            placeholder="Add a comment or your own spin on it…"
            aria-label="Comment"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
            }}
            className={cn(input, "min-h-11 resize-y")}
          />
          <SubmitButton className="h-11 w-11 shrink-0 rounded-xl p-0 shadow-[0_6px_18px_-8px_rgb(10_20_10/0.5)]" pendingLabel="">
            <SendHorizontal className="size-4" />
            <span className="sr-only">Send</span>
          </SubmitButton>
        </div>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </div>
    </form>
  );
}
