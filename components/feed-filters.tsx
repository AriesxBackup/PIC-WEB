"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import { STATUSES, STATUS_META, type Status } from "@/lib/constants";
import { feedHref, type FeedQuery } from "@/lib/feed";
import { cn } from "@/lib/utils";
import { input } from "./ui";

// 16px on phones (smaller text makes iOS zoom in on tap), compact on bigger screens.
const select = cn(input, "w-auto min-w-0 flex-1 cursor-pointer py-2 sm:flex-none sm:text-sm");

export function FeedFilters({
  query,
  tags,
  people,
}: {
  query: FeedQuery;
  tags: { tag: string; count: number }[];
  people: { id: number; name: string }[];
}) {
  const router = useRouter();

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    router.push(
      feedHref({
        status: query.status,
        q: text("q"),
        tag: text("tag"),
        by: Number(text("by")) || undefined,
        sort: text("sort") === "top" ? "top" : "new",
      }),
      { scroll: false },
    );
  }

  return (
    <div className="mb-5 space-y-3">
      <nav aria-label="Filter by status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {([undefined, ...STATUSES] as (Status | undefined)[]).map((status) => {
          const active = query.status === status;
          return (
            <Link
              key={status ?? "all"}
              href={feedHref({ ...query, status })}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors duration-150 ease-brand",
                active ? "text-on-brand" : "border border-border bg-surface text-muted hover:text-fg",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="feed-status-pill"
                  className="bg-brand absolute inset-0 rounded-full shadow-sm shadow-black/15"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              {status ? (
                <>
                  <span aria-hidden className="relative">
                    {STATUS_META[status].emoji}
                  </span>{" "}
                  <span className="relative">{STATUS_META[status].label}</span>
                </>
              ) : (
                <span className="relative">All ideas</span>
              )}
            </Link>
          );
        })}
      </nav>

      <form
        method="get"
        action="/"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          apply(event.currentTarget);
        }}
        className="flex flex-wrap gap-2"
      >
        {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
        <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Search ideas, tags, people…"
            aria-label="Search"
            enterKeyHint="search"
            className={cn(input, "py-2 pl-10")}
          />
        </div>
        <select name="tag" defaultValue={query.tag ?? ""} onChange={(e) => apply(e.currentTarget.form!)} className={select} aria-label="Tag">
          <option value="">All tags</option>
          {tags.map(({ tag, count }) => (
            <option key={tag} value={tag}>
              #{tag} ({count})
            </option>
          ))}
        </select>
        <select name="by" defaultValue={query.by ? String(query.by) : ""} onChange={(e) => apply(e.currentTarget.form!)} className={select} aria-label="Shared by">
          <option value="">Anyone</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={query.sort ?? "new"} onChange={(e) => apply(e.currentTarget.form!)} className={select} aria-label="Sort">
          <option value="new">Newest</option>
          <option value="top">🔥 Most votes</option>
        </select>
      </form>
    </div>
  );
}
