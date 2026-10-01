"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { SubmitButton } from "@/components/form-controls";
import { TagInput } from "@/components/tag-input";
import { Field, FormMessage, button, input } from "@/components/ui";
import { updateIdeaAction } from "@/lib/actions/reels";
import type { FormState } from "@/lib/actions/types";
import { MAX_IDEA_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function IdeaEditor({
  reelId,
  idea,
  tags,
  canEdit,
  knownTags,
}: {
  reelId: number;
  idea: string;
  tags: string[];
  canEdit: boolean;
  knownTags: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await updateIdeaAction(reelId, prev, formData);
    if (result?.ok) setEditing(false);
    return result;
  }, undefined);

  if (editing) {
    return (
      <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-4">
        <Field label="The idea" htmlFor="idea" error={state?.fields?.idea}>
          <textarea
            id="idea"
            name="idea"
            defaultValue={idea}
            rows={5}
            maxLength={MAX_IDEA_LENGTH}
            required
            autoFocus
            className={cn(input, "resize-y leading-relaxed")}
          />
        </Field>
        <Field label="Tags" htmlFor="edit-tags">
          <TagInput id="edit-tags" initial={tags} known={knownTags} />
        </Field>
        <FormMessage error={state?.error} />
        <div className="flex gap-2">
          <SubmitButton>Save</SubmitButton>
          <button type="button" onClick={() => setEditing(false)} className={button.ghost}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="rounded-2xl border border-pink-500/20 bg-linear-to-br from-pink-500/[0.07] via-transparent to-violet-500/[0.07] p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">💡 The idea</h2>
        {canEdit ? (
          <button type="button" onClick={() => setEditing(true)} className={cn(button.ghost, "-my-1.5 px-2 py-1.5 text-xs")}>
            <Pencil className="size-3.5" /> Edit
          </button>
        ) : null}
      </div>
      <p className="whitespace-pre-line text-lg leading-relaxed [overflow-wrap:anywhere]">{idea}</p>
      {tags.length ? (
        <p className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <a
              key={tag}
              href={`/?tag=${encodeURIComponent(tag)}`}
              className="inline-flex min-h-10 items-center rounded-full bg-surface px-3.5 text-sm font-medium text-muted ring-1 ring-border transition hover:text-fg sm:min-h-7 sm:px-2.5 sm:text-xs"
            >
              #{tag}
            </a>
          ))}
        </p>
      ) : null}
    </section>
  );
}
