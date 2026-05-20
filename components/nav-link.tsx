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
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
        style={{ backgroundColor: "#D4981F", color: "#1A1208" }}
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
      style={{ color: "#A89070" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#2A1E10";
        (e.currentTarget as HTMLAnchorElement).style.color = "#D4C9B0";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
        (e.currentTarget as HTMLAnchorElement).style.color = "#A89070";
      }}
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}
