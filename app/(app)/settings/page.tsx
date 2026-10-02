import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Card, PageHeader, button } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { logoutEverywhereAction } from "@/lib/actions/account";
import { logout } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/dal";
import { APP_NAME } from "@/lib/config";
import { NameForm, PasswordForm } from "./account-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-site";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  const siteUrl = `${proto}://${host}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" />

      <Reveal delay={0}>
        <Card className="flex items-center gap-4 p-4 sm:p-5">
          <Avatar person={user} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold tracking-tight">{user.name}</p>
            <p className="truncate text-sm text-muted">
              {user.email} · {user.role === "admin" ? "Admin" : "Member"}
            </p>
          </div>
          {user.role === "admin" ? (
            <Link href="/admin" className={button.secondary}>
              <Shield className="size-4" /> Team
            </Link>
          ) : null}
        </Card>
      </Reveal>

      <Reveal delay={0.05}>
        <Card className="p-4 sm:p-5">
          <h2 className="mb-4 font-semibold tracking-tight">Your name</h2>
          <NameForm name={user.name} />
        </Card>
      </Reveal>

      <Reveal delay={0.1}>
        <Card className="p-4 sm:p-5">
          <h2 className="mb-4 font-semibold tracking-tight">Change password</h2>
          <PasswordForm />
        </Card>
      </Reveal>

      <Reveal delay={0.15}>
        <Card className="space-y-4 p-4 sm:p-5">
          <div>
            <h2 className="font-semibold">📱 Put {APP_NAME} on your phone</h2>
            <p className="mt-1 text-sm text-muted">Then sharing a reel from Instagram takes two taps.</p>
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="font-medium">Android (Chrome)</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted">
              <li>
                Open <b className="text-fg">{siteUrl}</b> in Chrome → menu <b className="text-fg">⋮</b> → <b className="text-fg">Install app</b>.
              </li>
              <li>
                In Instagram, tap <b className="text-fg">Share</b> on a reel → <b className="text-fg">More / Share to…</b> → <b className="text-fg">{APP_NAME}</b>. The link lands straight in a new post.
              </li>
            </ol>
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="font-medium">iPhone (Safari)</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted">
              <li>
                Open <b className="text-fg">{siteUrl}</b> in Safari → <b className="text-fg">Share</b> → <b className="text-fg">Add to Home Screen</b>.
              </li>
              <li>
                In Instagram, tap <b className="text-fg">Share → Copy link</b>, open {APP_NAME} and tap <b className="text-fg">+</b> → <b className="text-fg">Paste</b>.
              </li>
            </ol>
            <details className="pt-1">
              <summary className="cursor-pointer text-muted hover:text-fg">Optional: share straight from Instagram on iPhone</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                <li>
                  Open the <b className="text-fg">Shortcuts</b> app → <b className="text-fg">+</b> → name it “{APP_NAME}”.
                </li>
                <li>
                  Turn on <b className="text-fg">Show in Share Sheet</b> (accepts URLs).
                </li>
                <li>
                  Add <b className="text-fg">URL Encode</b> (input: Shortcut Input), then <b className="text-fg">Open URLs</b> with:{" "}
                  <code className="break-all rounded bg-surface-2 px-1.5 py-0.5 text-xs text-fg">{siteUrl}/share?url=[URL Encoded Text]</code>
                </li>
                <li>
                  Now in Instagram: <b className="text-fg">Share → Share to… → {APP_NAME}</b>.
                </li>
              </ol>
            </details>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.2}>
        <Card className="flex flex-wrap gap-2 p-4 sm:p-5">
          <form action={logout}>
            <button type="submit" className={button.secondary}>
              <LogOut className="size-4" /> Log out
            </button>
          </form>
          <form action={logoutEverywhereAction}>
            <button type="submit" className={button.ghost}>
              Log out on all devices
            </button>
          </form>
        </Card>
      </Reveal>
    </div>
  );
}
