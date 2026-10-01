"use client";

import { useActionState, useState } from "react";
import { Copy, Dices } from "lucide-react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/form-controls";
import { Field, FormMessage, button, input } from "@/components/ui";
import { createMemberAction } from "@/lib/actions/admin";
import type { FormState } from "@/lib/actions/types";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Easy-to-type random password, e.g. "tiger-maple-4821". */
function generatePassword(): string {
  const words = ["tiger", "maple", "river", "pixel", "mango", "comet", "lotus", "cobalt", "ember", "orbit", "cedar", "neon"];
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
  const digits = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0");
  return `${pick()}-${pick()}-${digits}`;
}

export function AddMemberForm({ siteUrl }: { siteUrl: string }) {
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);
  const [password, setPassword] = useState("");
  // Controlled: a <select>'s defaultValue isn't restored after React resets the form on a failed submit.
  const [role, setRole] = useState("member");
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await createMemberAction(prev, formData);
    if (result?.ok) {
      setCreated({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
        password: String(formData.get("password") ?? ""),
      });
      setPassword("");
      setRole("member");
    }
    return result;
  }, undefined);
  const fields = state?.fields ?? {};

  const shareText = created
    ? `Hi ${created.name}! You're on our reel board 🎬\n${siteUrl ? `Open: ${siteUrl}\n` : ""}Email: ${created.email}\nPassword: ${created.password}`
    : "";

  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="member-name" error={fields.name}>
          <input id="member-name" name="name" required autoComplete="off" defaultValue={state?.values?.name} className={input} />
        </Field>
        <Field label="Email" htmlFor="member-email" error={fields.email}>
          <input
            id="member-email"
            name="email"
            type="email"
            inputMode="email"
            required
            autoComplete="off"
            defaultValue={state?.values?.email}
            className={input}
          />
        </Field>
        <Field label="Password" htmlFor="member-password" error={fields.password} hint={`At least ${MIN_PASSWORD_LENGTH} characters. They can change it later.`}>
          <div className="flex gap-2">
            <input
              id="member-password"
              name="password"
              type="text"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="off"
              spellCheck={false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(input, "font-mono")}
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className={cn(button.secondary, "shrink-0 px-3")}
              title="Generate a password"
            >
              <Dices className="size-4" />
              <span className="sr-only">Generate a password</span>
            </button>
          </div>
        </Field>
        <Field
          label="Role"
          htmlFor="member-role"
          error={fields.role}
          hint={role === "admin" ? "Also manages the team and production." : "Posts reels, comments and votes."}
        >
          <select
            id="member-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={cn(input, "cursor-pointer")}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <div className="space-y-3 sm:col-span-2">
          <FormMessage error={state?.error} />
          <SubmitButton pendingLabel="Adding…">Add member</SubmitButton>
        </div>
      </form>

      {created ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">✅ {created.name} was added</p>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-surface p-3 font-mono text-xs leading-relaxed">{shareText}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={button.secondary}
              onClick={() =>
                navigator.clipboard.writeText(shareText).then(
                  () => toast.success("Copied — paste it to them on WhatsApp/Slack"),
                  () => toast.error("Couldn't copy. Select the text and copy it manually."),
                )
              }
            >
              <Copy className="size-4" /> Copy login details
            </button>
            <button type="button" className={button.ghost} onClick={() => setCreated(null)}>
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
