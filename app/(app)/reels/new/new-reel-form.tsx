"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ClipboardPaste, X } from "lucide-react";
import { toast } from "sonner";
import { TimeAgo } from "@/components/clock";
import { SubmitButton } from "@/components/form-controls";
import { ReelEmbed } from "@/components/reel-embed";
import { TagInput } from "@/components/tag-input";
import { Field, FormMessage, button, chip, input } from "@/components/ui";
import { checkReelLink, createReelAction } from "@/lib/actions/reels";
import type { LinkCheck } from "@/lib/actions/types";
import { MAX_IDEA_LENGTH } from "@/lib/constants";
import { extractInstagramUrl, isInstagramShareLink, parseInstagramUrl } from "@/lib/instagram";
import { cn } from "@/lib/utils";

const STARTERS = [
  "Recreate this with our product: ",
  "Use this audio for ",
  "Copy the hook: ",
  "Same format, but about ",
];

export function NewReelForm({ initialUrl, knownTags }: { initialUrl: string; knownTags: string[] }) {
  const [state, formAction] = useActionState(createReelAction, undefined);
  const [url, setUrl] = useState(initialUrl);
  const [idea, setIdea] = useState("");
  const [check, setCheck] = useState<{ key: string; result: LinkCheck } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const ideaRef = useRef<HTMLTextAreaElement>(null);

  const parsed = parseInstagramUrl(url);
  const shareLink = !parsed && isInstagramShareLink(url);
  // Ask the server about this link (duplicate? share-link redirect?) once per distinct reel.
  const checkKey = parsed?.shortcode ?? (shareLink ? url.trim() : null);

  useEffect(() => {
    if (!checkKey) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await checkReelLink(url);
        if (!cancelled) setCheck({ key: checkKey, result });
      } catch {
        // offline or signed out — the form still validates on submit
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkKey, url]);

  const result = check?.key === checkKey ? check.result : null;
  const reel = parsed ?? (result && result.status !== "invalid" ? result : null);
  const duplicate = result?.status === "duplicate" ? result.existing : null;
  const resolving = shareLink && !result;
  const looksWrong = url.trim() !== "" && !parsed && (!shareLink || result?.status === "invalid");
  const urlError =
    state?.fields?.url ?? (looksWrong ? "That doesn't look like an Instagram reel or post link." : undefined);
  const existingId =
    duplicate?.id ??
    (state?.values?.existingId && state.values.url === url ? Number(state.values.existingId) : null);

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      const link = extractInstagramUrl(text) ?? text.trim();
      if (!link) {
        toast("Your clipboard is empty — tap Share → Copy link in Instagram first.");
        return;
      }
      setUrl(link);
      ideaRef.current?.focus();
    } catch {
      toast("Couldn't read the clipboard here. Long-press the link box and choose Paste.");
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <Field label="Instagram link" htmlFor="url" error={urlError}>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              id="url"
              name="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/…"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              autoFocus={!initialUrl}
              required
              className={cn(input, url && "pr-9")}
            />
            {url ? (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-fg"
                aria-label="Clear link"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <button type="button" onClick={paste} className={cn(button.secondary, "shrink-0")}>
            <ClipboardPaste className="size-4" />
            Paste
          </button>
        </div>
      </Field>

      {resolving ? <p className="text-sm text-muted">Opening the share link…</p> : null}

      {existingId ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-100">Already on the board 🙌</p>
          <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
            {duplicate ? (
              <>
                {duplicate.authorName ?? "Someone"} shared it <TimeAgo time={duplicate.createdAt} />.{" "}
              </>
            ) : null}
            Add your idea as a comment there instead.
          </p>
          <Link href={`/reels/${existingId}#discussion`} className={cn(button.secondary, "mt-3")}>
            Open it
          </Link>
        </div>
      ) : reel ? (
        // Compact by default so the idea box stays on screen (on a phone you've usually just watched it).
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 pl-4 pr-1.5 text-sm">
            <span className="flex-1 font-medium text-emerald-800 dark:text-emerald-200">✓ Reel found</span>
            <button
              type="button"
              onClick={() => setShowPreview((shown) => !shown)}
              aria-expanded={showPreview}
              className={cn(button.ghost, "text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-200")}
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
          </div>
          {showPreview ? (
            <ReelEmbed
              key={reel.shortcode}
              kind={reel.kind}
              shortcode={reel.shortcode}
              eager
              preview={false}
              className="mx-auto max-w-sm"
            />
          ) : null}
        </div>
      ) : null}

      <Field
        label="Your idea"
        htmlFor="idea"
        error={state?.fields?.idea}
        hint="What should we make with this? The hook, audio, format, an angle for our product…"
      >
        <textarea
          ref={ideaRef}
          id="idea"
          name="idea"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          autoFocus={!!initialUrl}
          rows={4}
          maxLength={MAX_IDEA_LENGTH}
          required
          placeholder="e.g. Recreate this transition with our new product and use the same trending audio."
          className={cn(input, "resize-y leading-relaxed")}
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => {
                setIdea((current) => (current.trim() ? `${current.trimEnd()}\n${starter}` : starter));
                ideaRef.current?.focus();
              }}
              className={chip}
            >
              {starter.replace(/[:\s]+$/, "")}…
            </button>
          ))}
        </div>
      </Field>

      <Field label="Tags" htmlFor="tags-input" hint="Optional — helps everyone filter later.">
        <TagInput id="tags-input" known={knownTags} />
      </Field>

      <FormMessage error={state?.error} />

      <div className="flex items-center gap-3">
        <SubmitButton
          disabled={!reel || !!existingId || idea.trim().length < 3}
          className="w-full sm:w-auto"
          pendingLabel="Saving…"
        >
          Save to the board
        </SubmitButton>
        <Link href="/" className={cn(button.ghost, "max-sm:hidden")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
