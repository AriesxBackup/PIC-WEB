"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { embedUrl, reelUrl, type ReelKind } from "@/lib/instagram";
import { cn } from "@/lib/utils";
import { button } from "./ui";

const INSTAGRAM_ORIGIN = "https://www.instagram.com";
/** A working player reports its size within a second or two of loading. */
const STALL_MS = 10_000;
/** How long a reel must stay on screen before its player starts (skips reels you scroll past). */
const SETTLE_MS = 250;

/**
 * Instagram's official player (the same iframe Instagram's embed.js creates), so reels play right here.
 *
 * Instagram's player is heavy (~50 requests each), so a feed shows a still preview first and only
 * starts the player once the reel is actually on screen. The preview has exactly the player's size
 * (208px of header/footer + a 4:5 video area), so nothing jumps when the player takes over.
 */
export function ReelEmbed({
  kind,
  shortcode,
  author,
  captioned = false,
  eager = false,
  preview = true,
  className,
}: {
  kind: ReelKind;
  shortcode: string;
  /** Creator's Instagram handle, shown on the preview when known. */
  author?: string | null;
  captioned?: boolean;
  /** Start the player right away (single-reel pages) instead of when scrolled into view. */
  eager?: boolean;
  /** Show the saved thumbnail (only exists for reels already on the board). */
  preview?: boolean;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [active, setActive] = useState(eager);
  const [height, setHeight] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(!preview);

  // Start the player once the reel has been on screen for a moment.
  useEffect(() => {
    if (active) return;
    const element = box.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        if (entry.isIntersecting) timer = setTimeout(() => setActive(true), SETTLE_MS);
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [active]);

  // The player reports its content height via postMessage ({ type: "MEASURE" }) once it's ready.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== INSTAGRAM_ORIGIN || event.source !== frame.current?.contentWindow) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        const measured = Number(data?.details?.height);
        if (data?.type === "MEASURE" && measured > 0) setHeight(Math.ceil(measured));
      } catch {
        // not a message for us
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Private, deleted or embed-blocked reels never report a size — offer the Instagram link instead.
  useEffect(() => {
    if (!loaded || height !== null) return;
    const timer = setTimeout(() => setStalled(true), STALL_MS);
    return () => clearTimeout(timer);
  }, [loaded, height]);

  const ready = height !== null;
  const unavailable = stalled && !ready;

  return (
    <div
      ref={box}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border bg-white dark:bg-surface-2",
        className,
      )}
      style={ready ? { height } : undefined}
    >
      {unavailable ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="text-3xl" aria-hidden>
            🙈
          </span>
          <p className="text-sm font-semibold text-fg">Can&apos;t play this reel here</p>
          <p className="text-xs text-muted">It may be private, deleted, or blocked from embedding.</p>
          <a href={reelUrl(kind, shortcode)} target="_blank" rel="noreferrer" className={cn(button.secondary, "mt-2")}>
            Watch on Instagram <ArrowUpRight className="size-4" />
          </a>
        </div>
      ) : !ready ? (
        <button
          type="button"
          onClick={() => setActive(true)}
          aria-label={active ? "Loading the reel" : "Load the reel"}
          className="block w-full text-left"
        >
          <span className="flex h-[54px] items-center gap-2.5 px-3">
            <span className="size-8 shrink-0 rounded-full bg-linear-to-tr from-amber-400 via-pink-500 to-violet-500 p-[2px]">
              <span className="block size-full rounded-full bg-white dark:bg-surface-2" />
            </span>
            {author ? (
              <span className="truncate text-sm font-semibold text-neutral-900 dark:text-fg">{author}</span>
            ) : (
              <span className="h-3 w-24 rounded-full bg-neutral-200 dark:bg-border" />
            )}
          </span>
          <span className="relative block aspect-[4/5] w-full bg-black">
            {!thumbFailed ? (
              <Image
                src={`/api/thumbs/${shortcode}`}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 1024px) 400px, 100vw"
                onError={() => setThumbFailed(true)}
                className="object-contain"
              />
            ) : (
              <span className="absolute inset-0 bg-brand opacity-70" />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                {active ? (
                  <span className="size-7 animate-spin rounded-full border-[3px] border-white/90 border-t-transparent" />
                ) : (
                  <Play className="ml-1 size-7 fill-current" />
                )}
              </span>
            </span>
          </span>
          <span className="flex h-[154px] flex-col justify-center gap-2.5 px-3">
            <span className="text-sm font-medium text-[#4f5bd5]">{active ? "Loading player…" : "View more on Instagram"}</span>
            <span className="h-3 w-2/3 rounded-full bg-neutral-200 dark:bg-border" />
            <span className="h-3 w-1/3 rounded-full bg-neutral-200 dark:bg-border" />
          </span>
        </button>
      ) : null}

      {active ? (
        <iframe
          ref={frame}
          src={embedUrl(kind, shortcode, captioned)}
          title={`Instagram reel ${shortcode}`}
          scrolling="no"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          className={cn(
            "block w-full border-0",
            ready ? "h-full" : "pointer-events-none absolute inset-0 h-full opacity-0",
            unavailable && "hidden",
          )}
        />
      ) : null}
    </div>
  );
}
