import Link from "next/link";
import { requireUser, isManager } from "@/lib/auth";
import { logout } from "@/app/actions";
import { ensureRecurring } from "@/lib/recurring";
import NavLinks from "@/components/NavLinks";

const ROLE = { owner: "Owner", lead: "Lead", member: "Team member" };

export default async function AppLayout({ children }) {
  const user = await requireUser();
  await ensureRecurring(); // create any repeating tasks that are due today
  const links = [
    ...(isManager(user)
      ? [["/dashboard", "Dashboard"], ["/tasks", "Tasks"], ["/recurring", "Repeating"], ["/team", "Team"], ["/attendance", "Attendance"], ["/clients", "Clients"]]
      : []),
    ...(user.role === "owner" ? [["/services", "Services"]] : []),
    ["/my-day", "My Day"],
    ["/notifications", "Notifications"],
    ["/account", "Account"],
  ];

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" className="brand">
          <img src="/yenoh-logo.png" alt="Yenoh" />
          <span className="mark">Desk</span>
        </Link>
        <NavLinks links={links} />
        <div className="who">
          <div>
            <b>{user.name}</b>
            <span className="muted">{ROLE[user.role]}</span>
          </div>
          <form action={logout}>
            <button className="linkbtn">Log out</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
