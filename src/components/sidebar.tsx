"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  School,
  MapPin,
  CreditCard,
  CalendarDays,
  ClipboardCheck,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Bosh sahifa", icon: LayoutGrid },
  { href: "/users", label: "Foydalanuvchilar", icon: Users },
  { href: "/groups", label: "Guruhlar", icon: School },
  { href: "/attendance", label: "Davomat", icon: ClipboardCheck },
  { href: "/filials", label: "Filiallar", icon: MapPin },
  { href: "/debts", label: "Moliyaviy boshqaruv", icon: CreditCard },
  { href: "/schedule", label: "Dars jadvali", icon: CalendarDays },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  const initials = (profile?.name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      className="flex h-screen w-64 shrink-0 flex-col"
      style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
    >
      <div className="px-6 py-6">
        <p className="text-[15px] font-semibold tracking-tight">Ziyo Admin</p>
        <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Boshqaruv paneli
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                <Icon size={17} strokeWidth={2} />
                {item.label}
                <span
                  className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: "var(--surface-muted)", color: "var(--text-tertiary)" }}
                >
                  tez orada
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] font-medium transition-colors duration-150"
              style={
                active
                  ? { background: "var(--accent-soft)", color: "var(--accent)" }
                  : { color: "var(--text-secondary)" }
              }
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-5" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 rounded-[12px] px-2 py-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{profile?.name || "—"}</p>
            <p className="truncate text-[11.5px]" style={{ color: "var(--text-tertiary)" }}>
              {profile?.role}
            </p>
          </div>
          <button
            onClick={() => logout()}
            title="Chiqish"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--surface-muted)]"
            style={{ color: "var(--text-tertiary)" }}
          >
            <LogOut size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
