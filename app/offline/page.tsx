import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

// Cached by the service worker and shown when the phone has no connection.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-3 text-4xl">📡</div>
      <h1 className="text-xl font-bold">You&apos;re offline</h1>
      <p className="mt-1.5 max-w-xs text-sm text-muted">Reconnect to see the team&apos;s reels. Your links will be waiting.</p>
    </main>
  );
}
