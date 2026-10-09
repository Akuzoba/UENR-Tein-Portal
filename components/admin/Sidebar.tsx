"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, FileText, History, Images, LayoutDashboard, LogOut, Menu, Printer, Settings, UserRound, Users, X } from "lucide-react";
import Logo from "../brand/Logo";
import { logout } from "@/app/admin/actions";
import { can, roleLabel, type Permission } from "@/lib/roles";

// Items without a permission are open to every admin (Settings holds "change your password").
const NAV: ({ section: string; needs: Permission } | { href: string; label: string; icon: typeof Users; needs?: Permission })[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, needs: "dashboard.view" },
  { href: "/admin/members", label: "Members", icon: Users, needs: "members.view" },
  { href: "/admin/cards", label: "Print cards", icon: Printer, needs: "cards.print" },
  { href: "/admin/activity", label: "Activity log", icon: History, needs: "audit.view" },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { section: "Website", needs: "website.edit" },
  { href: "/admin/website", label: "Site content", icon: FileText, needs: "website.edit" },
  { href: "/admin/website/executives", label: "Executives", icon: UserRound, needs: "website.edit" },
  { href: "/admin/website/activities", label: "Activities", icon: Images, needs: "website.edit" },
];

// Exact match for pages that have sub-sections of their own in the menu.
const EXACT = new Set(["/admin", "/admin/website"]);

type Who = { username: string; role: string };

function Nav({ username, role, onNavigate, morph = false }: Who & { onNavigate?: () => void; morph?: boolean }) {
  const path = usePathname();
  const active = (href: string) => (EXACT.has(href) ? path === href : path.startsWith(href));

  return (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="px-2" onClick={onNavigate}>
        <Logo morph={morph} />
      </Link>
      <nav className="mt-8 flex flex-col gap-0.5">
        {NAV.filter((item) => !item.needs || can(role, item.needs)).map((item) => {
          if ("section" in item)
            return <div key={item.section} className="mt-5 mb-1 px-3 text-xs font-semibold tracking-wider text-muted/80 uppercase">{item.section}</div>;
          const { href, label, icon: Icon } = item;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                active(href) ? "bg-paper text-ink" : "text-muted hover:bg-paper/70 hover:text-ink"
              }`}
            >
              <span className={`absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full transition-colors ${active(href) ? "bg-ndc-red" : "bg-transparent"}`} />
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <a href="/" target="_blank" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink">
          <ExternalLink className="h-[18px] w-[18px]" /> View site
        </a>
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ndc-green text-sm font-bold text-white uppercase">{username[0]}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{username}</div>
            <div className="text-xs text-muted">{roleLabel(role)}</div>
          </div>
          <form action={logout}>
            <button className="rounded-md p-2 text-muted transition-colors hover:bg-paper hover:text-ndc-red" title="Sign out" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ username, role }: Who) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-line bg-white p-4 lg:block" style={{ viewTransitionName: "site-header" }}>
        <div className="flag-rule absolute inset-x-0 top-0 h-1" />
        <Nav username={username} role={role} morph />
      </aside>

      <div className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <Link href="/admin"><Logo /></Link>
        <button onClick={() => setOpen(true)} className="btn btn-ghost px-2.5" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      </div>

      {/* Mobile drawer (CSS transitions only) */}
      <div
        onClick={() => setOpen(false)}
        className={`no-print fixed inset-0 z-50 bg-ink/40 transition-opacity duration-200 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-white p-4 transition-transform duration-300 ease-out lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!open}
      >
        <button onClick={() => setOpen(false)} className="absolute top-4 right-4 rounded-md p-2 text-muted hover:bg-paper" aria-label="Close menu"><X className="h-5 w-5" /></button>
        <Nav username={username} role={role} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
