// Creates the tasks that repeating rules call for. Called whenever someone opens Desk,
// and once a day by the scheduled job (see vercel.json). It runs as one all-or-nothing
// database step, so two callers at once can never create the same task twice.
import { get, transaction } from "./db";
import { notify } from "./notify";
import { today, addDays, weekday } from "./time";

export const FREQ = { daily: "Every day (Mon to Sat)", weekly: "Every week", monthly: "Every month" };
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CATCH_UP_DAYS = 7; // after a long gap, only the last week's tasks are created

const daysInMonth = (d) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).getUTCDate();

function matches(rule, d) {
  if (rule.freq === "daily") return weekday(d) !== 0;
  if (rule.freq === "weekly") return weekday(d) === rule.weekday;
  // monthly: a rule for the 31st falls on the last day of shorter months
  return +d.slice(8) === Math.min(rule.month_day, daysInMonth(d));
}

export function describeRule(rule) {
  if (rule.freq === "weekly") return `Every ${WEEKDAYS[rule.weekday]}`;
  if (rule.freq === "monthly") return `Every month on day ${rule.month_day}`;
  return FREQ.daily;
}

export async function ensureRecurring() {
  const t = today();
  // Quick check first, so the common case (nothing due) costs one small query.
  const stale = await get("SELECT COUNT(*) AS n FROM recurring WHERE active = 1 AND last_run < ?", t);
  if (!stale.n) return 0;

  const perPerson = new Map(); // how many new tasks each person got, for their notification
  const total = await transaction(async (tx) => {
    let created = 0;
    const rules = await tx.all("SELECT * FROM recurring WHERE active = 1 AND last_run < ?", t);
    for (const rule of rules) {
      const first = addDays(rule.last_run, 1);
      const floor = addDays(t, -CATCH_UP_DAYS);
      const start = first > floor ? first : floor;
      const live = await tx.get(
        "SELECT (SELECT active FROM clients WHERE id = ?) AS c, (SELECT active FROM users WHERE id = ?) AS u",
        rule.client_id, rule.assignee_id
      );
      // Skip generating for clients who left or people who were deactivated.
      if (live && live.c === 1 && live.u === 1) {
        let checklist = "[]";
        try {
          const svc = await tx.get("SELECT checklist FROM services WHERE id = ?", rule.service_id);
          const items = JSON.parse(svc?.checklist ?? "[]");
          checklist = JSON.stringify(items.map((x) => ({ t: x, done: false })));
        } catch {}
        for (let d = start; d <= t; d = addDays(d, 1)) {
          if (!matches(rule, d)) continue;
          await tx.run(
            `INSERT INTO tasks(title, details, client_id, service_id, assignee_id, created_by, due, source, checklist, created_at, recurring_id)
             VALUES(?,?,?,?,?,?,?,'Recurring',?,?,?)`,
            rule.title, rule.details, rule.client_id, rule.service_id, rule.assignee_id, rule.created_by, d, checklist, t, rule.id
          );
          created++;
          perPerson.set(rule.assignee_id, (perPerson.get(rule.assignee_id) ?? 0) + 1);
        }
      }
      await tx.run("UPDATE recurring SET last_run = ? WHERE id = ?", t, rule.id);
    }
    return created;
  });
  // After the tasks are safely saved, tell each person once (not once per task).
  for (const [userId, n] of perPerson) {
    await notify(userId, {
      kind: "assigned",
      title: n === 1 ? "1 repeating task added for you" : `${n} repeating tasks added for you`,
      body: "Your repeating tasks for today are ready.",
      link: "/my-day",
    });
  }
  return total;
}
