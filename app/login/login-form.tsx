"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form-controls";
import { Field, FormMessage, input } from "@/components/ui";
import { login } from "@/lib/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          autoFocus
          defaultValue={state?.values?.email}
          className={input}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
      </Field>
      <FormMessage error={state?.error} />
      <SubmitButton className="w-full" pendingLabel="Logging in…">
        Log in
      </SubmitButton>
      <p className="hairline-t relative mt-5 pt-4 text-center text-xs text-muted">No account yet? Ask your team admin to add you.</p>
    </form>
  );
}
