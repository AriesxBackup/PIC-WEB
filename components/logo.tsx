import { useId } from "react";

export function Logo({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#feda75" />
          <stop offset="0.3" stopColor="#fa7e1e" />
          <stop offset="0.55" stopColor="#d62976" />
          <stop offset="0.8" stopColor="#962fbf" />
          <stop offset="1" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${id})`} />
      <rect x="120" y="120" width="272" height="272" rx="76" fill="none" stroke="#fff" strokeWidth="34" />
      <path d="M226 198 L318 256 L226 314 Z" fill="#fff" stroke="#fff" strokeWidth="18" strokeLinejoin="round" />
    </svg>
  );
}
