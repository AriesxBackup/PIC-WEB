"use client";

import { useEffect } from "react";

/** Registers public/sw.js (offline fallback page + makes the app installable). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal — the site works without it (e.g. on plain http).
    });
  }, []);
  return null;
}
