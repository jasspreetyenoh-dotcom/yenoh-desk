"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The sidebar links. The Notifications link shows a live count of unread items:
// it updates on every page change, when you come back to the tab, and every minute.
export default function NavLinks({ links }) {
  const path = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const res = await fetch("/api/notifications/count", { cache: "no-store" });
        if (res.ok && alive) setUnread((await res.json()).count);
      } catch {}
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [path]);

  return (
    <nav className="nav">
      {links.map(([href, label]) => (
        <Link key={href} href={href} className={path === href || path.startsWith(href + "/") ? "on" : ""}>
          {label}
          {href === "/notifications" && unread > 0 && (
            <span className="badge" aria-label={`${unread} unread`}>{unread > 99 ? "99+" : unread}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
