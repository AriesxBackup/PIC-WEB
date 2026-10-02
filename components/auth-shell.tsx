import type { ReactNode } from "react";
import { Logo } from "./logo";

export function AuthShell({ appName, title, subtitle, children }: { appName: string; title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      {/* Ambient light — one soft green breath above, one below. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 left-1/2 h-[26rem] w-[52rem] -translate-x-1/2 rounded-full bg-accent opacity-[0.1] blur-3xl" />
        <div className="absolute -bottom-48 left-[6%] size-96 rounded-full bg-accent opacity-[0.06] blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-4 size-16 shadow-[0_12px_36px_-12px_rgb(10_20_10/0.5)]" />
          <p className="eyebrow">{appName}</p>
          <h1 className="mt-2 text-3xl font-medium tracking-[-0.03em] text-fg-strong">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="glass card-surface relative overflow-hidden rounded-3xl border border-border p-5 shadow-xl shadow-black/[0.08] sm:p-6 dark:shadow-black/50">
          <span aria-hidden className="hairline-t absolute inset-x-0 top-0" />
          {children}
        </div>
      </div>
    </main>
  );
}
