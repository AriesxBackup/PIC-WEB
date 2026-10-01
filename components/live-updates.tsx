"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

type LiveEvent = {
  type: string;
  reelId: number;
  actorId: number;
  message?: string;
  targetUserId?: number;
};

/** Listens to /api/events and refreshes the page whenever a teammate changes something. */
export function LiveUpdates({ userId }: { userId: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refreshSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    const source = new EventSource("/api/events");
    source.onmessage = (message) => {
      let event: LiveEvent;
      try {
        event = JSON.parse(message.data);
      } catch {
        return;
      }
      const forMe = event.targetUserId === undefined || event.targetUserId === userId;
      if (event.message && event.actorId !== userId && forMe) {
        toast(event.message, {
          action: event.type === "reel.deleted"
            ? undefined
            : { label: "Open", onClick: () => router.push(`/reels/${event.reelId}`) },
        });
      }
      refreshSoon();
    };

    // Phones pause background tabs; catch up when the app comes back to the foreground.
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshSoon();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      source.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, userId]);

  return null;
}
