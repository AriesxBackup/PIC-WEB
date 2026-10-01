"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form-controls";
import { Field, FormMessage, input } from "@/components/ui";
import { changeMyPasswordAction, updateMyNameAction } from "@/lib/actions/account";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateMyNameAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Shown to the team as" htmlFor="name" error={state?.fields?.name}>
        <input id="name" name="name" defaultValue={name} required autoComplete="name" className={input} />
      </Field>
      <FormMessage error={state?.error} message={state?.message} />
      <SubmitButton variant="secondary">Save name</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changeMyPasswordAction, undefined);
  const fields = state?.fields ?? {};
  return (
    <form action={action} className="space-y-3">
      <Field label="Current password" htmlFor="current" error={fields.current}>
        <input id="current" name="current" type="password" autoComplete="current-password" required className={input} />
      </Field>
      <Field label="New password" htmlFor="new-password" error={fields.password} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          className={input}
        />
      </Field>
      <Field label="Repeat new password" htmlFor="confirm" error={fields.confirm}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={input} />
      </Field>
      <FormMessage error={state?.error} message={state?.message} />
      <SubmitButton variant="secondary">Change password</SubmitButton>
    </form>
  );
}
