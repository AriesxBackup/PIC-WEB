import type { ReactNode } from "react";
import { Logo } from "./logo";

export function AuthShell({ appName, title, subtitle, children }: { appName: string; title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-brand opacity-20 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-4 size-14 drop-shadow-lg" />
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">{appName}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl shadow-black/5 sm:p-6">{children}</div>
      </div>
    </main>
  );
}
