"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small still of a reel (board and task lists), falling back to the brand gradient. */
export function ReelThumb({ shortcode, className }: { shortcode: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand text-on-brand shadow-md shadow-black/20 ring-1 ring-black/10 dark:ring-white/10",
        className,
      )}
    >
      {!failed ? (
        <Image
          src={`/api/thumbs/${shortcode}`}
          alt=""
          fill
          unoptimized
          sizes="64px"
          onError={() => setFailed(true)}
          className="object-cover"
        />
      ) : null}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-b from-white/25 via-transparent to-black/15 ring-1 ring-inset ring-white/20"
      />
      <Play className="relative size-4 fill-current drop-shadow" />
    </span>
  );
}
