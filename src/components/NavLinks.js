"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ links }) {
  const path = usePathname();
  return (
    <nav className="nav">
      {links.map(([href, label]) => (
        <Link key={href} href={href} className={path === href || path.startsWith(href + "/") ? "on" : ""}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
