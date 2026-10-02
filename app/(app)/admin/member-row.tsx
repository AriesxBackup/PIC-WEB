"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { KeyRound, Pencil, Power, Trash2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { ActionButton, ConfirmButton, SubmitButton } from "@/components/form-controls";
import { springSoft } from "@/components/motion";
import { Field, FormMessage, button, input } from "@/components/ui";
import {
  deleteMemberAction,
  resetMemberPasswordAction,
  setMemberActiveAction,
  updateMemberAction,
} from "@/lib/actions/admin";
import type { FormState } from "@/lib/actions/types";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import type { TeamMember } from "@/lib/data/users";
import { cn } from "@/lib/utils";

// Phones: actions get their own row as labelled icon buttons. Bigger screens: inline on the right.
const ACTION = "flex-1 flex-col gap-0.5 px-1 text-xs sm:flex-none sm:flex-row sm:gap-2 sm:px-3 sm:text-sm";

export function MemberRow({ member, isSelf }: { member: TeamMember; isSelf: boolean }) {
  const [panel, setPanel] = useState<"edit" | "password" | null>(null);
  const toggle = (next: "edit" | "password") => setPanel((current) => (current === next ? null : next));

  return (
    <li
      className={cn(
        "px-4 py-3.5 transition-colors duration-200 ease-brand hover:bg-surface-2/40 sm:px-5",
        !member.active && "bg-surface-2/60",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Avatar person={member} size="md" className={cn(!member.active && "opacity-50")} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
            <Link href={`/profile/${member.id}`} className="truncate hover:text-accent hover:underline">
              {member.name}
            </Link>
            {isSelf ? <span className="text-xs text-muted">(you)</span> : null}
            {member.role === "admin" ? (
              <span className="bg-brand-soft text-brand rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-accent/25">
                <span className="text-brand">Admin</span>
              </span>
            ) : null}
            {!member.active ? (
              <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-[11px] font-semibold text-muted">Turned off</span>
            ) : null}
          </p>
          <p className="truncate text-sm text-muted">{member.email}</p>
          <p className="text-xs text-muted">
            {member.reelCount} reel{member.reelCount === 1 ? "" : "s"} shared
            {member.openTaskCount ? ` · ${member.openTaskCount} open task${member.openTaskCount === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <div className="flex w-full gap-1 sm:w-auto">
          <button
            type="button"
            onClick={() => toggle("edit")}
            className={cn(button.ghost, ACTION, panel === "edit" && "bg-surface-2 text-fg")}
            aria-expanded={panel === "edit"}
          >
            <Pencil className="size-4" /> Edit
          </button>
          <button
            type="button"
            onClick={() => toggle("password")}
            className={cn(button.ghost, ACTION, panel === "password" && "bg-surface-2 text-fg")}
            aria-expanded={panel === "password"}
          >
            <KeyRound className="size-4" /> Password
          </button>
          {!isSelf ? (
            <ActionButton
              action={setMemberActiveAction.bind(null, member.id, !member.active)}
              variant="ghost"
              className={ACTION}
              title={member.active ? "Turn off: they can no longer log in" : "Turn back on"}
            >
              <Power className="size-4" /> {member.active ? "Turn off" : "Turn on"}
            </ActionButton>
          ) : null}
          {!isSelf ? (
            <ConfirmButton
              action={deleteMemberAction.bind(null, member.id)}
              variant="ghost"
              confirmLabel="Sure?"
              className={cn(ACTION, "text-red-600 dark:text-red-400")}
            >
              <Trash2 className="size-4" /> Delete
            </ConfirmButton>
          ) : null}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {panel === "edit" ? (
          <motion.div
            key="edit"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springSoft}
            className="overflow-hidden"
          >
            <EditMember member={member} onDone={() => setPanel(null)} />
          </motion.div>
        ) : null}
        {panel === "password" ? (
          <motion.div
            key="password"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springSoft}
            className="overflow-hidden"
          >
            <ResetPassword member={member} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

function EditMember({ member, onDone }: { member: TeamMember; onDone: () => void }) {
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await updateMemberAction(member.id, prev, formData);
    if (result?.ok) onDone();
    return result;
  }, undefined);
  const fields = state?.fields ?? {};

  return (
    <form action={action} className="mt-3 grid gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-3">
      <Field label="Name" htmlFor={`name-${member.id}`} error={fields.name}>
        <input id={`name-${member.id}`} name="name" defaultValue={state?.values?.name ?? member.name} required className={input} />
      </Field>
      <Field label="Email" htmlFor={`email-${member.id}`} error={fields.email}>
        <input
          id={`email-${member.id}`}
          name="email"
          type="email"
          defaultValue={state?.values?.email ?? member.email}
          required
          className={input}
        />
      </Field>
      <Field label="Role" htmlFor={`role-${member.id}`} error={fields.role}>
        <select id={`role-${member.id}`} name="role" defaultValue={state?.values?.role ?? member.role} className={cn(input, "cursor-pointer")}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      <div className="space-y-2 sm:col-span-3">
        <FormMessage error={state?.error} />
        <SubmitButton variant="secondary">Save changes</SubmitButton>
      </div>
    </form>
  );
}

function ResetPassword({ member }: { member: TeamMember }) {
  const [state, action] = useActionState(resetMemberPasswordAction.bind(null, member.id), undefined);

  return (
    <form action={action} className="mt-3 space-y-3 rounded-xl border border-border bg-surface p-3">
      <Field
        label={`New password for ${member.name}`}
        htmlFor={`password-${member.id}`}
        error={state?.fields?.password}
        hint="They'll be signed out everywhere and need this new password."
      >
        <input
          id={`password-${member.id}`}
          name="password"
          type="text"
          minLength={MIN_PASSWORD_LENGTH}
          required
          autoComplete="off"
          spellCheck={false}
          className={cn(input, "font-mono")}
        />
      </Field>
      <FormMessage error={state?.error} message={state?.message} />
      <SubmitButton variant="secondary">Set password</SubmitButton>
    </form>
  );
}
