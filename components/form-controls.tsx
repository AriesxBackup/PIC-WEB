"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { button } from "./ui";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className,
  disabled,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: keyof typeof button;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={cn(button[variant], className)}>
      {pending ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          {pendingLabel ?? "Saving…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Destructive actions ask for a second tap instead of a browser confirm() dialog,
 * which is friendlier on phones.
 */
export function ConfirmButton({
  action,
  children,
  confirmLabel = "Tap again to confirm",
  className,
  variant = "danger",
}: {
  action: () => Promise<{ error?: string } | void>;
  children: ReactNode;
  confirmLabel?: string;
  className?: string;
  variant?: keyof typeof button;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      disabled={pending}
      className={cn(button[variant], armed && "ring-2 ring-red-500/50", className)}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setArmed(false), 4000);
          return;
        }
        clearTimeout(timer.current);
        setArmed(false);
        startTransition(async () => {
          const result = await action();
          if (result && result.error) toast.error(result.error);
        });
      }}
    >
      {pending ? "Working…" : armed ? confirmLabel : children}
    </button>
  );
}

/** Calls a server action from a button (no form), showing errors as toasts. */
export function ActionButton({
  action,
  children,
  className,
  variant = "secondary",
  title,
}: {
  action: () => Promise<{ error?: string } | void>;
  children: ReactNode;
  className?: string;
  variant?: keyof typeof button;
  title?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      title={title}
      disabled={pending}
      className={cn(button[variant], className)}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (result && result.error) toast.error(result.error);
        })
      }
    >
      {children}
    </button>
  );
}
