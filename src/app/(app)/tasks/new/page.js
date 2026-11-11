import Link from "next/link";
import { all } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { today, addDays } from "@/lib/time";
import { activeClients, services } from "@/lib/queries";
import { createTask } from "@/app/actions";
import { PageHead } from "@/components/ui";

export const metadata = { title: "New task · Yenoh Desk" };

export default async function NewTask({ searchParams }) {
  await requireManager();
  const { error } = await searchParams;
  const [clients, svc] = await Promise.all([activeClients(), services()]);
  // Show each person's open task count so work goes to whoever has room.
  const people = await all(
    `SELECT u.id, u.name, u.job_title,
       (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status != 'done') AS open
     FROM users u WHERE u.active = 1 ORDER BY u.name`
  );

  if (clients.length === 0) {
    return (
      <>
        <PageHead title="New" mark="task" />
        <div className="card">
          <p>Add a client first, then you can create tasks for them.</p>
          <p style={{ marginTop: 14 }}><Link href="/clients" className="btn-sm">Go to Clients</Link></p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead title="New" mark="task" sub="Log the request as soon as it comes in, so it is never forgotten." />
      <div className="card" style={{ maxWidth: 640 }}>
        {error && <div className="msg err">Fill in the title, client, service, person and due date.</div>}
        <form action={createTask}>
          <div className="fld">
            <label htmlFor="title">What needs to be done?</label>
            <input id="title" name="title" type="text" required maxLength={160} placeholder="e.g. Reply to comments on the new reel" />
          </div>
          <div className="fld">
            <label htmlFor="details">Details (optional)</label>
            <textarea id="details" name="details" maxLength={1000} placeholder="Paste the client's message or add instructions" />
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
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.open} open)</option>
                ))}
              </select>
            </div>
            <div className="fld">
              <label htmlFor="due">Due date</label>
              <input id="due" name="due" type="date" required defaultValue={addDays(today(), 1)} />
            </div>
            <div className="fld">
              <label htmlFor="source">Came from</label>
              <select id="source" name="source">
                <option>WhatsApp</option>
                <option>Call</option>
                <option>Email</option>
                <option>Internal</option>
              </select>
            </div>
          </div>
          <div className="acts" style={{ marginTop: 6 }}>
            <button className="btn">Create task</button>
            <Link href="/tasks" className="linkbtn">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  );
}
