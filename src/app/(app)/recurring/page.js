import { all } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { activeClients, activeUsers, services } from "@/lib/queries";
import { describeRule, WEEKDAYS } from "@/lib/recurring";
import { createRecurring, toggleRecurring, deleteRecurring } from "@/app/config-actions";
import { PageHead, Hidden } from "@/components/ui";
import ConfirmButton from "@/components/ConfirmButton";

export const metadata = { title: "Repeating tasks · Yenoh Desk" };

export default async function RecurringPage({ searchParams }) {
  await requireManager();
  const { error, added } = await searchParams;
  const rules = await all(
    `SELECT r.*, c.name AS client, s.name AS service, u.name AS assignee
     FROM recurring r JOIN clients c ON c.id = r.client_id JOIN services s ON s.id = r.service_id JOIN users u ON u.id = r.assignee_id
     ORDER BY r.active DESC, c.name, r.title`
  );
  const [clients, users, svc] = await Promise.all([activeClients(), activeUsers(), services()]);
  const ready = clients.length > 0 && users.length > 0;

  return (
    <>
      <PageHead
        title="Repeating"
        mark="tasks"
        sub="Set a job once, like daily comment replies. Desk creates it for you every time it is due, so nobody has to remember."
      />
      {added && <div className="msg ok">Saved. The task is created automatically when it is due.</div>}
      {error && <div className="msg err">Fill in the title, client, service and person, and the day it repeats on.</div>}

      <div className="stack">
        <div className="card">
          <h2>Current repeating tasks</h2>
          {rules.length === 0 && <div className="empty">None yet. Add your first one below.</div>}
          {rules.map((r) => (
            <div className="row" key={r.id} style={r.active ? undefined : { opacity: 0.55 }}>
              <div>
                <div className="t">{r.title}</div>
                <div className="muted">{r.client} · {r.service} · {r.assignee}</div>
              </div>
              <div className="acts">
                <span className="chip soft">{describeRule(r)}</span>
                {!r.active && <span className="chip grey">Paused</span>}
                <form action={toggleRecurring}>
                  <Hidden id={r.id} />
                  <button className="btn-sm btn-white">{r.active ? "Pause" : "Resume"}</button>
                </form>
                <form action={deleteRecurring}>
                  <Hidden id={r.id} />
                  <ConfirmButton className="btn-sm btn-danger" message="Delete this repeating task? Tasks it already created will stay.">
                    Delete
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </div>

        {ready ? (
          <div className="card" style={{ maxWidth: 720 }}>
            <h2>Add a repeating task</h2>
            <form action={createRecurring}>
              <div className="fld">
                <label htmlFor="title">Task title</label>
                <input id="title" name="title" type="text" required maxLength={160} placeholder="e.g. Reply to comments and DMs" />
              </div>
              <div className="fld">
                <label htmlFor="details">Details (optional)</label>
                <textarea id="details" name="details" maxLength={1000} />
              </div>
              <div className="grid2">
                <div className="fld">
                  <label htmlFor="client_id">Client</label>
                  <select id="client_id" name="client_id" required>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="fld">
                  <label htmlFor="service_id">Service</label>
                  <select id="service_id" name="service_id" required>
                    {svc.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="fld">
                  <label htmlFor="assignee_id">Assign to</label>
                  <select id="assignee_id" name="assignee_id" required>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="fld">
                  <label htmlFor="freq">How often</label>
                  <select id="freq" name="freq">
                    <option value="daily">Every day (Mon to Sat)</option>
                    <option value="weekly">Every week</option>
                    <option value="monthly">Every month</option>
                  </select>
                </div>
                <div className="fld">
                  <label htmlFor="weekday">If weekly: on which day</label>
                  <select id="weekday" name="weekday" defaultValue="1">
                    {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="fld">
                  <label htmlFor="month_day">If monthly: day of the month (1 to 31)</label>
                  <input id="month_day" name="month_day" type="number" min="1" max="31" defaultValue="1" />
                </div>
              </div>
              <button className="btn">Save repeating task</button>
            </form>
          </div>
        ) : (
          <div className="card empty">Add at least one client and one team member first.</div>
        )}
      </div>
    </>
  );
}
