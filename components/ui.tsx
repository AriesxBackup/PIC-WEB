import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Minimum heights keep every control comfortably tappable on phones (44px main buttons, 40px small ones).
export const button = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand shadow-[0_10px_24px_-12px_rgb(10_20_10/0.55)] transition-[filter,transform,box-shadow] duration-200 ease-brand hover:brightness-110 hover:shadow-[0_12px_28px_-12px_rgb(10_20_10/0.65)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-sm shadow-black/[0.04] transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-brand hover:border-accent/50 hover:bg-surface-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
  ghost:
    "inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-[color,background-color,transform] duration-200 ease-brand hover:bg-surface-2 hover:text-fg active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50",
  danger:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-600 transition-[color,background-color,transform,box-shadow] duration-200 ease-brand hover:bg-red-500/20 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 dark:text-red-400",
};

// 16px text stops iOS Safari from zooming into inputs; min-h keeps empty date fields from collapsing on iOS.
// Slightly recessed surface so fields read as fillable inside a card.
export const input =
  "min-h-11 w-full rounded-xl border border-border bg-surface-2/70 px-3.5 py-2.5 text-base text-fg outline-none transition-[color,background-color,border-color,box-shadow] duration-200 ease-brand placeholder:text-muted/70 hover:bg-surface-2 focus:border-accent/60 focus:bg-surface focus:shadow-[0_0_0_4px_rgb(5_138_94/0.13)] disabled:opacity-60";

/** Pill-shaped option buttons (filters, suggestions) — 40px tall on phones, compact on bigger screens. */
export const chip =
  "inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-3.5 text-sm text-muted transition-[color,border-color,background-color,transform] duration-200 ease-brand hover:border-accent/50 hover:text-fg active:scale-[0.96] sm:min-h-8 sm:px-3 sm:text-xs";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "card-surface rounded-2xl border border-border bg-surface shadow-sm shadow-black/[0.04] dark:shadow-black/30",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300" role="alert">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-700 dark:text-emerald-300" role="status">
        {message}
      </p>
    );
  }
  return null;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <span aria-hidden className="mb-3 block h-0.5 w-9 bg-fg-strong" />
        <h1 className="text-[1.7rem] font-medium leading-tight tracking-[-0.03em] text-balance sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-[15px]">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
      <div className="bg-brand-soft mb-5 flex size-16 items-center justify-center rounded-2xl text-3xl ring-1 ring-border">
        {icon}
      </div>
      <h2 className="text-lg font-medium">{title}</h2>
      {children ? <div className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{children}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-xl bg-linear-to-r from-surface-2 via-border/60 to-surface-2 bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
