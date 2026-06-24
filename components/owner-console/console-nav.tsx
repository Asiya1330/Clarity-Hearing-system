"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface ConsoleNavItem {
  href: string;
  label: string;
}

export function ConsoleNav({ items }: { items: ConsoleNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-white/15 text-brand-white"
                : "text-brand-white/70 hover:bg-brand-white/10 hover:text-brand-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
