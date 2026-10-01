"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Columns3, Home, Plus, Settings, Shield } from "lucide-react";
import type { ComponentType } from "react";
import { Avatar } from "./avatar";
import { Logo } from "./logo";
import { button } from "./ui";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }>; badge?: number };

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader({
  appName,
  user,
  openTasks,
}: {
  appName: string;
  user: { id: number; name: string; role: "admin" | "member" };
  openTasks: number;
}) {
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: "/", label: "Feed", icon: Home },
    { href: "/board", label: "Board", icon: Columns3 },
    { href: "/tasks", label: "My tasks", icon: CheckSquare, badge: openTasks },
    ...(user.role === "admin" ? [{ href: "/admin", label: "Team", icon: Shield }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2.5 font-bold tracking-tight">
          <Logo className="size-8 shrink-0" />
          <span className="truncate text-lg">{appName}</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive(pathname, item.href) ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
              {item.badge ? <Badge count={item.badge} /> : null}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* max-md:hidden (a variant) reliably beats the button's own inline-flex; on phones the bottom bar has "+" */}
          <Link href="/reels/new" className={cn(button.primary, "max-md:hidden")}>
            <Plus className="size-4" />
            Add reel
          </Link>
          <Link
            href="/settings"
            className="rounded-full p-0.5 transition hover:ring-2 hover:ring-border"
            aria-label="Your account"
            title={`${user.name} — settings`}
          >
            <Avatar person={user} size="md" className="ring-0" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ isAdmin, openTasks }: { isAdmin: boolean; openTasks: number }) {
  const pathname = usePathname();
  const left: NavItem[] = [
    { href: "/", label: "Feed", icon: Home },
    { href: "/board", label: "Board", icon: Columns3 },
  ];
  const right: NavItem[] = [
    { href: "/tasks", label: "Tasks", icon: CheckSquare, badge: openTasks },
    isAdmin ? { href: "/admin", label: "Team", icon: Shield } : { href: "/settings", label: "Me", icon: Settings },
  ];

  const renderItem = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition",
        isActive(pathname, item.href) ? "text-fg" : "text-muted",
      )}
    >
      <item.icon className="size-6" />
      {item.label}
      {item.badge ? <Badge count={item.badge} className="absolute right-[calc(50%-22px)] top-1" /> : null}
    </Link>
  );

  return (
    <nav
      aria-label="Main"
      className="bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center px-2">
        {left.map(renderItem)}
        <div className="flex flex-1 justify-center">
          <Link
            href="/reels/new"
            aria-label="Add a reel"
            className="-mt-5 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-pink-500/30 transition active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </Link>
        </div>
        {right.map(renderItem)}
      </div>
    </nav>
  );
}

function Badge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-4.5 items-center justify-center rounded-full bg-pink-600 px-1 text-[10px] font-bold leading-[18px] text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
