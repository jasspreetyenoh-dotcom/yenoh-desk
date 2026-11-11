import Link from "next/link";
import { all } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { today, addDays, weekday, fmtDate, isDate } from "@/lib/time";
import { markAttendance } from "@/app/actions";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Attendance · Yenoh Desk" };

export default async function AttendancePage({ searchParams }) {
  await requireManager();
  const sp = await searchParams;
  const t = today();
  const end = isDate(sp.end || "") && sp.end <= t ? sp.end : t;
  const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));

  const members = await all("SELECT * FROM users WHERE active = 1 AND role != 'owner' ORDER BY name");
  const rows = await all("SELECT * FROM attendance WHERE date BETWEEN ? AND ?", days[0], end);
  const byKey = new Map(rows.map((r) => [r.user_id + "|" + r.date, r]));

  // One cell: P present, L leave, A absent, – weekly off (Sunday), blank before they joined.
  function cell(m, d) {
    const a = byKey.get(m.id + "|" + d);
    if (a?.status === "leave") return { k: "L", tip: "On leave" };
    if (a?.status === "present") {
      const tip = a.in_time ? `In ${a.in_time}${a.out_time ? ", out " + a.out_time : ""}` : "Marked present";
      return { k: "P", tip };
    }
    if (d < m.created_at) return { k: "N", tip: "Not joined yet", text: "" };
    if (weekday(d) === 0) return { k: "O", tip: "Weekly off", text: "–" };
    if (d === t) return { k: "O", tip: "Not checked in yet", text: "?" };
    return { k: "A", tip: "Absent" };
  }

  return (
    <>
      <PageHead title="Team" mark="attendance" sub="P = present, L = leave, A = absent. Hover a box to see check-in times." />

      <div className="bar">
        <Link href={`/attendance?end=${addDays(end, -7)}`} className="btn-sm btn-white">← Earlier</Link>
        <b>{fmtDate(days[0])} to {fmtDate(end)}</b>
        {end < t && <Link href={`/attendance?end=${addDays(end, 7) > t ? t : addDays(end, 7)}`} className="btn-sm btn-white">Later →</Link>}
      </div>

      <div className="stack">
        <div className="card scroll">
          {members.length === 0 ? (
            <div className="empty">No team members yet.</div>
          ) : (
            <table className="att">
              <thead>
                <tr>
                  <th>Member</th>
                  {days.map((d) => (
                    <th key={d}>{fmtDate(d, { weekday: "short" })}<br />{fmtDate(d, { day: "numeric" })}</th>
                  ))}
                  <th>Present</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const cells = days.map((d) => cell(m, d));
                  const present = cells.filter((c) => c.k === "P").length;
                  const working = cells.filter((c) => c.k === "P" || c.k === "A" || c.k === "L").length;
                  return (
                    <tr key={m.id}>
                      <td><b>{m.name}</b><br /><span className="muted">{m.emp_type} · {m.work_mode}</span></td>
                      {cells.map((c, i) => (
                        <td key={days[i]}><span className={"dot " + c.k} title={c.tip}>{c.text ?? c.k}</span></td>
                      ))}
                      <td><b>{present}/{working}</b></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {members.length > 0 && (
          <div className="card" style={{ maxWidth: 720 }}>
            <h2>Correct a day</h2>
            <p className="muted" style={{ marginBottom: 12 }}>Use this for approved leave, or when someone forgot to check in.</p>
            <form action={markAttendance} className="bar" style={{ marginBottom: 0 }}>
              <select name="user_id" aria-label="Team member" required>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input type="date" name="date" aria-label="Date" required defaultValue={t} max={t} />
              <select name="value" aria-label="Mark as">
                <option value="leave">On leave</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
              <button className="btn-sm">Save</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
