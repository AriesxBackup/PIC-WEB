import Link from "next/link";
import { button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-3 text-4xl">🫥</div>
      <h1 className="text-xl font-bold">Not found</h1>
      <p className="mt-1.5 text-sm text-muted">This reel or page doesn&apos;t exist (anymore).</p>
      <Link href="/" className={`${button.primary} mt-5`}>
        Back to the feed
      </Link>
    </main>
  );
}
