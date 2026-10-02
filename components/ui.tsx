import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Minimum heights keep every control comfortably tappable on phones (44px main buttons, 40px small ones).
export const button = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-600/25 transition-[filter,transform,box-shadow] duration-150 ease-brand hover:brightness-110 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-sm shadow-black/5 transition-[color,background-color,border-color,transform] duration-150 ease-brand hover:border-pink-500/30 hover:bg-surface-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50",
  ghost:
    "inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-[color,background-color] duration-150 ease-brand hover:bg-surface-2 hover:text-fg active:bg-surface-2 disabled:pointer-events-none disabled:opacity-50",
  danger:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-600 transition-[color,background-color,transform] duration-150 ease-brand hover:bg-red-500/15 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 dark:text-red-400",
};

// 16px text stops iOS Safari from zooming into inputs; min-h keeps empty date fields from collapsing on iOS.
// Slightly recessed surface so fields read as fillable inside a card.
export const input =
  "min-h-11 w-full rounded-xl border border-border bg-surface-2/70 px-3.5 py-2.5 text-base text-fg shadow-inner shadow-black/[0.03] outline-none transition-[color,background-color,border-color,box-shadow] duration-150 ease-brand placeholder:text-muted/70 focus:border-pink-500/60 focus:bg-surface focus:ring-4 focus:ring-pink-500/15 disabled:opacity-60";

/** Pill-shaped option buttons (filters, suggestions) — 40px tall on phones, compact on bigger screens. */
export const chip =
  "inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-3.5 text-sm text-muted transition-[color,border-color,background-color] duration-150 ease-brand hover:border-pink-500/40 hover:text-fg active:bg-surface-2 sm:min-h-8 sm:px-3 sm:text-xs";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "card-surface rounded-2xl border border-border bg-surface shadow-sm shadow-black/5 dark:shadow-black/40",
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
      <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300" role="alert">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p className="rounded-xl bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-700 dark:text-emerald-300" role="status">
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
        <span aria-hidden className="mb-2.5 block h-1 w-9 rounded-full bg-brand" />
        <h1 className="text-[1.55rem] font-bold leading-tight tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
      <div className="bg-brand-soft mb-4 flex size-14 items-center justify-center rounded-2xl text-3xl ring-1 ring-border">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children ? <div className="mt-1.5 max-w-sm text-sm text-muted">{children}</div> : null}
    </div>
  );
}
