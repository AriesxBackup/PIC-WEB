"use client";

import { TriangleAlert } from "lucide-react";
import { button } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="glass card-surface w-full rounded-3xl border border-border px-6 py-12 shadow-2xl shadow-black/10 dark:shadow-black/50">
        <div className="bg-brand-soft relative mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl text-3xl ring-1 ring-border">
          <span aria-hidden className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]" />
          <TriangleAlert className="relative size-7" aria-hidden />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-brand">Something went wrong</h1>
        <p className="mt-1.5 text-sm text-muted">Try again — if it keeps happening, tell your admin.</p>
        <button type="button" onClick={reset} className={`${button.primary} mt-5`}>
          Try again
        </button>
      </div>
    </div>
  );
}
