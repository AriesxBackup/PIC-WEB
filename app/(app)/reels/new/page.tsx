import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { listTags } from "@/lib/data/reels";
import { NewReelForm } from "./new-reel-form";

export const metadata: Metadata = { title: "Add a reel" };

export default async function NewReelPage({ searchParams }: PageProps<"/reels/new">) {
  await requireUser();
  const { url, shared } = await searchParams;
  const initialUrl = typeof url === "string" ? url.slice(0, 2000) : "";
  const sharedText = typeof shared === "string" ? shared : "";

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Add a reel" subtitle="Paste an Instagram link and tell the team what we could make with it." />
      {sharedText && !initialUrl ? (
        <p className="mb-5 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          We couldn&apos;t find an Instagram link in what you shared (“{sharedText.slice(0, 120)}”). Copy the reel
          link in Instagram and paste it below.
        </p>
      ) : null}
      <NewReelForm initialUrl={initialUrl} knownTags={(await listTags()).map((t) => t.tag)} />
    </div>
  );
}
