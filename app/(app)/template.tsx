"use client";

import { PageEnter } from "@/components/motion";

/** Remounts on every navigation (Next template) so each page enters with a soft rise. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageEnter>{children}</PageEnter>;
}
