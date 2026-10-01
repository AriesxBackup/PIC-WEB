"use client";

import { useEffect } from "react";

/**
 * Marks <html data-keyboard> while a phone's on-screen keyboard is open (the visual viewport
 * shrinks well below the layout viewport). CSS uses it to hide the bottom bar, which would
 * otherwise float above the keyboard and cover the field being typed in.
 */
export function KeyboardWatch() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      document.documentElement.toggleAttribute("data-keyboard", window.innerHeight - viewport.height > 150);
    };
    viewport.addEventListener("resize", update);
    update();
    return () => {
      viewport.removeEventListener("resize", update);
      document.documentElement.removeAttribute("data-keyboard");
    };
  }, []);
  return null;
}
