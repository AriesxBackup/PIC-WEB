import Link from "next/link";
import { button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="glass card-surface w-full max-w-md rounded-3xl border border-border px-6 py-12 shadow-2xl shadow-black/10 dark:shadow-black/50">
        <div className="bg-brand-soft relative mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl text-3xl ring-1 ring-border">
          <span aria-hidden className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]" />
          <span className="relative">🫥</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-brand">Not found</h1>
        <p className="mt-1.5 text-sm text-muted">This reel or page doesn&apos;t exist (anymore).</p>
        <Link href="/" className={`${button.primary} mt-5`}>
          Back to the feed
        </Link>
      </div>
    </main>
  );
}
