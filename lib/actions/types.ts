/** Result returned by form actions used with React's useActionState. */
export type FormState =
  | {
      ok?: boolean;
      error?: string;
      /** Per-field error messages, keyed by input name. */
      fields?: Record<string, string>;
      /** Echoed input so fields keep their values after a failed submit. */
      values?: Record<string, string>;
      message?: string;
    }
  | undefined;

export type LinkCheck =
  | { status: "invalid" }
  | { status: "ok"; kind: "reel" | "p" | "tv"; shortcode: string; url: string }
  | {
      status: "duplicate";
      kind: "reel" | "p" | "tv";
      shortcode: string;
      url: string;
      existing: { id: number; authorName: string | null; createdAt: number };
    };
