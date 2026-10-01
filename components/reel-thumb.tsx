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
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand text-white shadow-inner",
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
      <Play className="relative size-4 fill-current drop-shadow" />
    </span>
  );
}
