import { NextResponse } from "next/server";
import { all, get, run } from "@/lib/db";
import { isCronRequest } from "@/lib/cronAuth";
import { ensureRecurring } from "@/lib/recurring";
import { notify, managerIds } from "@/lib/notify";
import { today } from "@/lib/time";

// Called every morning by Vercel (see vercel.json).
//  - Each person gets a reminder if they have work due today or overdue.
//  - The owner and leads get one summary of what is late across the team.
// Safe to run twice in a day: nobody gets the same reminder twice.
export async function GET(request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  await ensureRecurring();
  const t = today();
  await run("DELETE FROM notifications WHERE created_at < ?", Date.now() - 60 * 864e5); // keep 60 days

  const open = await all(
    `SELECT t.assignee_id, t.title, t.due, u.name AS person
     FROM tasks t JOIN users u ON u.id = t.assignee_id
     WHERE t.status != 'done' AND t.due <= ? AND u.active = 1 ORDER BY t.due, t.id`,
    t
  );
  const already = new Set(
    (await all("SELECT user_id, kind FROM notifications WHERE day = ? AND kind IN ('reminder','summary')", t)).map(
      (r) => `${r.user_id}|${r.kind}`
    )
  );

  // Per person
  const byPerson = new Map();
  for (const r of open) {
    if (!byPerson.has(r.assignee_id)) byPerson.set(r.assignee_id, []);
    byPerson.get(r.assignee_id).push(r);
  }
  let reminders = 0;
  for (const [userId, rows] of byPerson) {
    if (already.has(`${userId}|reminder`)) continue;
    const late = rows.filter((r) => r.due < t).length;
    const dueToday = rows.length - late;
    const list = rows.slice(0, 5).map((r) => `• ${r.title}${r.due < t ? " (overdue)" : ""}`).join("\n");
    await notify(userId, {
      kind: "reminder",
      title: `Today: ${dueToday} due, ${late} overdue`,
      body: list + (rows.length > 5 ? `\n…and ${rows.length - 5} more` : ""),
      link: "/my-day",
    });
    reminders++;
  }

  // One summary for the owner and leads
  const overdueRows = open.filter((r) => r.due < t);
  const waiting = (await get("SELECT COUNT(*) AS n FROM tasks WHERE status = 'review'")).n;
  let summaries = 0;
  if (overdueRows.length > 0 || waiting > 0) {
    const counts = new Map();
    for (const r of overdueRows) counts.set(r.person, (counts.get(r.person) ?? 0) + 1);
    const who = [...counts].map(([name, n]) => `${name} (${n})`).join(", ");
    const recipients = (await managerIds()).filter((id) => !already.has(`${id}|summary`));
    if (recipients.length > 0) {
      await notify(recipients, {
        kind: "summary",
        title: `Team: ${overdueRows.length} overdue, ${waiting} waiting for review`,
        body: overdueRows.length ? `Overdue: ${who}` : "Nothing is overdue.",
        link: "/dashboard",
      });
      summaries = recipients.length;
    }
  }
  return NextResponse.json({ ok: true, reminders, summaries });
}
