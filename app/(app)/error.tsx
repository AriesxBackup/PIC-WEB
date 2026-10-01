"use client";

import { button } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="mb-3 text-4xl">😵</div>
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="mt-1.5 text-sm text-muted">Try again — if it keeps happening, tell your admin.</p>
      <button type="button" onClick={reset} className={`${button.primary} mt-5`}>
        Try again
      </button>
    </div>
  );
}
