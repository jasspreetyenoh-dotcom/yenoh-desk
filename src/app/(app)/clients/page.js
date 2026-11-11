import Link from "next/link";
import { all } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { today } from "@/lib/time";
import { services } from "@/lib/queries";
import { createClient } from "@/app/actions";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Clients · Yenoh Desk" };

export default async function ClientsPage({ searchParams }) {
  await requireManager();
  const { error } = await searchParams;
  const t = today();
  const clients = await all(
    `SELECT c.*,
       (SELECT COUNT(*) FROM tasks k WHERE k.client_id = c.id AND k.status != 'done') AS open,
       (SELECT COUNT(*) FROM tasks k WHERE k.client_id = c.id AND k.status != 'done' AND k.due < ?) AS overdue
     FROM clients c ORDER BY c.active DESC, c.name`,
    t
  );
  const links = await all(
    "SELECT cs.client_id, s.name FROM client_services cs JOIN services s ON s.id = cs.service_id ORDER BY s.sort"
  );
  const svc = await services();

  return (
    <>
      <PageHead title="Our" mark="clients" sub="Each client and the services they have bought." />
      {error && <div className="msg err">Enter the client's name.</div>}

      <div className="stack">
        {clients.length > 0 && (
          <div className="grid3">
            {clients.map((c) => (
              <div className="card" key={c.id} style={c.active ? undefined : { opacity: 0.55 }}>
                <h2 style={{ marginBottom: 4 }}>{c.name}</h2>
                <div className="muted" style={{ marginBottom: 12 }}>{c.contact || "No contact added"}</div>
                <div className="chips" style={{ marginBottom: 14 }}>
                  {links.filter((l) => l.client_id === c.id).map((l) => (
                    <span className="chip soft" key={l.name}>{l.name}</span>
                  ))}
                  {!c.active && <span className="chip grey">Inactive</span>}
                </div>
                <div className="row" style={{ borderTop: 0, padding: 0 }}>
                  <span>
                    {c.open} open {c.open === 1 ? "task" : "tasks"}
                    {c.overdue > 0 && <> · <b style={{ color: "var(--red)" }}>{c.overdue} overdue</b></>}
                  </span>
                  <Link href={`/clients/${c.id}`} className="btn-sm btn-white">Edit</Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ maxWidth: 720 }}>
          <h2>Add a client</h2>
          <form action={createClient}>
            <div className="grid2">
              <div className="fld">
                <label htmlFor="name">Client name</label>
                <input id="name" name="name" type="text" required maxLength={120} />
              </div>
              <div className="fld">
                <label htmlFor="contact">Contact (person, phone)</label>
                <input id="contact" name="contact" type="text" maxLength={200} />
              </div>
            </div>
            <span className="lbl">Services they have bought</span>
            <div className="checks">
              {svc.map((s) => (
                <label key={s.id}>
                  <input type="checkbox" name="services" value={s.id} /> {s.name}
                </label>
              ))}
            </div>
            <button className="btn">Add client</button>
          </form>
        </div>
      </div>
    </>
  );
}
