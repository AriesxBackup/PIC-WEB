"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/form-controls";
import { Field, FormMessage, button, input } from "@/components/ui";
import { removeAvatarAction, uploadAvatarAction } from "@/lib/actions/profile";
import type { FormState } from "@/lib/actions/types";
import { AVATAR_MIME_TYPES, MAX_AVATAR_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ProfileEditor({ bio, igHandle }: { bio: string; igHandle: string }) {
  const [state, action] = useActionState(updateProfileAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Instagram handle" htmlFor="ig-handle" error={state?.fields?.igHandle} hint="Shown on your profile with a link.">
          <div className="relative">
            <span aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
              @
            </span>
            <input
              id="ig-handle"
              name="igHandle"
              defaultValue={igHandle}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="yourhandle"
              className={cn(input, "pl-8")}
            />
          </div>
        </Field>
        <div className="flex items-end pb-0.5">
          <p className="text-sm leading-relaxed text-muted">
            Your name, email and password live in <b className="font-medium text-fg">Account settings</b>.
          </p>
        </div>
      </div>
      <Field label="About you" htmlFor="bio" error={state?.fields?.bio} hint="A line or two the team sees on your profile.">
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={400}
          defaultValue={bio}
          placeholder="What do you make? What should the team pull you in for?"
          className={cn(input, "resize-y leading-relaxed")}
        />
      </Field>
      <FormMessage error={state?.error} message={state?.message} />
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function AvatarUpload({
  person,
  className,
}: {
  person: { id: number; name: string; avatarVersion: number };
  className?: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, formAction] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await uploadAvatarAction(prev, formData);
    if (result?.fields?.avatar) {
      setError(result.fields.avatar);
      setPreview(null);
    } else {
      setError(null);
      setPreview(null);
      toast.success("Photo updated.");
    }
    return result;
  }, undefined);

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Photos must be JPEG, PNG or WebP.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Keep the photo under 4 MB.");
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    const data = new FormData();
    data.set("avatar", file);
    startTransition(async () => formAction(data));
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative">
        {preview ? (
          <span className="block size-28 overflow-hidden rounded-full ring-2 ring-surface" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview only */}
            <img src={preview} alt="" className="size-full object-cover" />
          </span>
        ) : (
          <Avatar person={{ id: person.id, name: person.name, avatarV: person.avatarVersion || undefined }} size="2xl" />
        )}
        {pending ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-white drop-shadow" aria-hidden />
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="bg-brand text-on-brand absolute -bottom-1 -right-1 flex size-10 items-center justify-center rounded-full shadow-lg shadow-black/25 ring-2 ring-bg transition-transform duration-200 ease-spring hover:brightness-110 active:scale-90"
          aria-label="Change your photo"
          title="Change your photo"
        >
          <Camera className="size-4.5" />
        </button>
      </div>
      <input ref={fileInput} type="file" accept={AVATAR_MIME_TYPES.join(",")} onChange={choose} className="hidden" aria-hidden tabIndex={-1} />
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {person.avatarVersion > 0 ? (
        <form action={removeAvatarAction}>
          <button
            type="submit"
            disabled={pending}
            className={cn(button.ghost, "gap-1.5 px-2 py-1 text-xs text-muted hover:text-red-600 dark:hover:text-red-400")}
          >
            <Trash2 className="size-3.5" /> Remove photo
          </button>
        </form>
      ) : (
        <p className="text-xs text-muted">JPEG, PNG or WebP, up to 4 MB</p>
      )}
    </div>
  );
}
