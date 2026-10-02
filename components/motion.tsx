"use client";

import { MotionConfig, motion, useReducedMotion } from "motion/react";
import type { HTMLMotionProps, Variants } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const spring = { type: "spring", stiffness: 380, damping: 30 } as const;
export const springSoft = { type: "spring", stiffness: 210, damping: 26 } as const;

/** Global motion defaults — honors the OS "reduce motion" setting everywhere. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </MotionConfig>
  );
}

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  shown: { opacity: 1, y: 0, scale: 1 },
};

/**
 * Fade-up reveal. Runs on mount when `inView` is false, otherwise the first time
 * the element scrolls into the viewport (list items cascade via `delay`).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  inView = false,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  inView?: boolean;
  as?: "div" | "section" | "li" | "article" | "span";
}) {
  const reduced = useReducedMotion();
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial={reduced ? false : "hidden"}
      {...(inView ? { whileInView: "shown", viewport: { once: true, margin: "-32px" } } : { animate: "shown" })}
      variants={revealVariants}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: Math.min(delay, 0.5) }}
    >
      {children}
    </Component>
  );
}

/** Wraps a page (used from template.tsx) so every navigation enters with a soft rise. */
export function PageEnter({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Card hover lift — pure transform, springy, safe on touch (only fires for fine pointers). */
export function HoverLift({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -3 }}
      transition={spring}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Animated number — used for vote counts so taps visibly roll the value. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  return (
    <motion.span
      key={value}
      className={cn("inline-block", className)}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      {value}
    </motion.span>
  );
}
