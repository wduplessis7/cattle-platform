"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export function NavLink({ href, icon, label }: NavLinkProps) {
  const pathname = usePathname();

  // Dashboard is active only on exact "/", others match prefix
  const isActive =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  if (isActive) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 pl-[calc(0.75rem-3px)] pr-3 py-2 rounded-lg text-sm font-semibold transition-colors border-l-[3px] border-[#22C55E]"
        style={{ backgroundColor: "#1A3322", color: "#FFFFFF" }}
      >
        <span>{icon}</span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group"
      style={{ color: "#94A3B8" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#1A3322";
        (e.currentTarget as HTMLAnchorElement).style.color = "#FFFFFF";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
        (e.currentTarget as HTMLAnchorElement).style.color = "#94A3B8";
      }}
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}
