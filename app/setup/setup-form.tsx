"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form-controls";
import { Field, FormMessage, input } from "@/components/ui";
import { setupAdmin } from "@/lib/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

export function SetupForm({ token }: { token: string }) {
  const [state, action] = useActionState(setupAdmin, undefined);
  const fields = state?.fields ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Your name" htmlFor="name" error={fields.name}>
        <input id="name" name="name" autoComplete="name" required autoFocus defaultValue={state?.values?.name} className={input} />
      </Field>
      <Field label="Email" htmlFor="email" error={fields.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={state?.values?.email}
          className={input}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={fields.password} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          className={input}
        />
      </Field>
      <Field label="Repeat password" htmlFor="confirm" error={fields.confirm}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={input} />
      </Field>
      <FormMessage error={state?.error} />
      <SubmitButton className="w-full" pendingLabel="Creating…">
        Create admin account
      </SubmitButton>
    </form>
  );
}
