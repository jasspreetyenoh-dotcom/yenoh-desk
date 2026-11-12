import { all } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { openNotification, markAllRead } from "@/app/actions";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Notifications · Yenoh Desk" };

const WHEN = { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await all("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 60", user.id);
  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <PageHead title="Your" mark="notifications" sub="New tasks, work sent back, reviews and reminders show up here.">
        {unread > 0 && (
          <form action={markAllRead}>
            <button className="btn-sm btn-white">Mark all as read</button>
          </form>
        )}
      </PageHead>

      <div className="card" style={{ maxWidth: 760, padding: 0 }}>
        {items.length === 0 && <div className="empty" style={{ padding: 20 }}>Nothing yet. You will see updates here.</div>}
        {items.map((n) => (
          <form action={openNotification} key={n.id} className="notif-row">
            <input type="hidden" name="id" value={n.id} />
            <button className={"notif" + (n.read ? "" : " unread")}>
              <span className="notif-dot" aria-hidden="true" />
              <span className="notif-main">
                <span className="notif-title">{n.title}</span>
                {n.body && <span className="notif-body">{n.body}</span>}
                <span className="muted">
                  {new Date(n.created_at).toLocaleString("en-IN", WHEN)}
                  {n.read ? "" : " · unread"}
                </span>
              </span>
            </button>
          </form>
        ))}
      </div>
    </>
  );
}
