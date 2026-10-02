import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AtSign, BadgeCheck, Settings } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Reveal } from "@/components/motion";
import { button } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { getProfile } from "@/lib/data/users";
import { formatShortDate } from "@/lib/utils";
import { AvatarUpload, ProfileEditor } from "./profile-editor";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({ params }: PageProps<"/profile/[id]">) {
  const viewer = await requireUser();
  const { id } = await params;
  const profileId = Number(id);
  if (!Number.isSafeInteger(profileId) || profileId <= 0) notFound();
  const profile = await getProfile(profileId);
  if (!profile || (!profile.active && viewer.role !== "admin" && viewer.id !== profile.id)) notFound();

  const isSelf = viewer.id === profile.id;
  const joined = formatShortDate(profile.createdAt);
  const stats = [
    { label: "Reels shared", value: profile.reelCount },
    { label: "Votes received", value: profile.votesReceived },
    { label: "Comments", value: profile.commentCount },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className={`${button.ghost} -ml-3 mb-2`}>
        <ArrowLeft className="size-4" /> Feed
      </Link>

      <Reveal>
        <section className="card-surface flex flex-col items-center gap-6 rounded-2xl border border-border bg-surface p-6 shadow-sm shadow-black/[0.04] sm:flex-row sm:items-center sm:p-8 dark:shadow-black/30">
          {isSelf ? (
            <AvatarUpload person={{ id: profile.id, name: profile.name, avatarVersion: profile.avatarVersion }} />
          ) : (
            <Avatar person={{ id: profile.id, name: profile.name, avatarV: profile.avatarVersion || undefined }} size="2xl" />
          )}

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:justify-start">
              <h1 className="text-3xl font-medium tracking-[-0.03em] text-fg-strong">{profile.name}</h1>
              <span className="bg-brand-soft text-brand inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-accent/25">
                {profile.role === "admin" ? <BadgeCheck className="size-3.5" aria-hidden /> : null}
                {profile.role === "admin" ? "Admin" : "Member"}
              </span>
              {!profile.active ? (
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted ring-1 ring-inset ring-border">
                  Turned off
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 truncate text-sm text-muted">
              {profile.email} · Joined {joined}
            </p>
            {profile.igHandle ? (
              <a
                href={`https://www.instagram.com/${profile.igHandle}/`}
                target="_blank"
                rel="noreferrer"
                className="text-brand mt-2.5 inline-flex min-h-8 items-center gap-1.5 text-sm font-medium hover:underline"
              >
                <AtSign className="size-4" aria-hidden />
                {profile.igHandle}
              </a>
            ) : null}
            {isSelf ? (
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Link href="/settings" className={`${button.secondary} min-h-9 px-3 py-1.5 text-xs`}>
                  <Settings className="size-3.5" /> Account settings
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      </Reveal>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={0.06 * index}>
            <div className="card-surface rounded-2xl border border-border bg-surface p-4 text-center sm:p-5">
              <p className="font-display text-3xl font-medium tracking-tight text-fg-strong tabular-nums">{stat.value}</p>
              <p className="eyebrow mt-1.5 text-[0.65rem]">{stat.label}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.08} className="mt-4">
        <section className="card-surface rounded-2xl border border-border bg-surface p-6 shadow-sm shadow-black/[0.04] sm:p-8 dark:shadow-black/30">
          <h2 className="eyebrow">About</h2>
          {profile.bio ? (
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed [overflow-wrap:anywhere]">{profile.bio}</p>
          ) : (
            <p className="mt-3 text-sm italic text-muted">
              {isSelf ? "No bio yet — tell the team what you make." : "No bio yet."}
            </p>
          )}
        </section>
      </Reveal>

      {isSelf ? (
        <Reveal delay={0.12} className="mt-4">
          <section className="card-surface rounded-2xl border border-border bg-surface p-6 shadow-sm shadow-black/[0.04] sm:p-8 dark:shadow-black/30">
            <h2 className="mb-5 font-medium tracking-tight">Edit profile</h2>
            <ProfileEditor bio={profile.bio} igHandle={profile.igHandle} />
          </section>
        </Reveal>
      ) : null}
    </div>
  );
}
