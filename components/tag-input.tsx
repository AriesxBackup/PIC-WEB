"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { spring } from "@/components/motion";
import { MAX_TAGS, SUGGESTED_TAGS, normalizeTag } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { chip, input as inputStyles } from "./ui";

/** Chip-style tag picker. Submits each tag as a hidden `tags` input. */
export function TagInput({
  initial = [],
  known = [],
  name = "tags",
  id,
}: {
  initial?: string[];
  known?: string[];
  name?: string;
  id?: string;
}) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const field = useRef<HTMLInputElement>(null);
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");

  const full = tags.length >= MAX_TAGS;
  const pool = [...new Set([...known, ...SUGGESTED_TAGS])];
  const query = normalizeTag(draft);
  const suggestions = pool.filter((t) => !tags.includes(t) && (!query || t.includes(query))).slice(0, 8);

  function add(raw: string) {
    const tag = normalizeTag(raw);
    if (tag && !tags.includes(tag) && !full) setTags([...tags, tag]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === " ") {
      if (draft.trim()) {
        event.preventDefault();
        add(draft);
      } else if (event.key === "Enter") {
        event.preventDefault();
      }
    } else if (event.key === "Backspace" && !draft && tags.length) {
      setTags(tags.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      {tags.map((tag) => (
        <input key={tag} type="hidden" name={name} value={tag} />
      ))}
      {/* Tapping anywhere in the box puts the cursor in the text field (easier on phones). */}
      <div
        onClick={(e) => e.target === e.currentTarget && field.current?.focus()}
        className={cn(inputStyles, "flex cursor-text flex-wrap items-center gap-1.5 py-0.5")}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {tags.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={spring}
              className="bg-brand-soft text-brand inline-flex min-h-8 items-center gap-0.5 rounded-full pl-3 text-sm font-medium ring-1 ring-inset ring-accent/25 backdrop-blur-sm"
            >
              #{tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="flex size-8 items-center justify-center rounded-full transition-colors duration-200 hover:bg-accent/15 active:bg-accent/15"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="size-4" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={field}
          id={inputId}
          value={draft}
          disabled={full}
          onChange={(e) => {
            const value = e.target.value;
            if (value.endsWith(",")) add(value.slice(0, -1));
            else setDraft(value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={full ? `Up to ${MAX_TAGS} tags` : tags.length ? "Add another…" : "hook, audio, trend…"}
          className="min-h-10 min-w-24 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70"
          autoComplete="off"
          enterKeyHint="done"
        />
      </div>
      {!full && suggestions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <button key={tag} type="button" onClick={() => add(tag)} className={chip}>
              + {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
