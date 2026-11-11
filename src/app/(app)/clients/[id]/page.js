import Link from "next/link";
import { notFound } from "next/navigation";
import { all, get } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { services } from "@/lib/queries";
import { updateClient } from "@/app/actions";
import { PageHead, Hidden } from "@/components/ui";

export const metadata = { title: "Edit client · Yenoh Desk" };

export default async function ClientPage({ params }) {
  await requireManager();
  const { id } = await params;
  const c = await get("SELECT * FROM clients WHERE id = ?", Number(id) || 0);
  if (!c) notFound();
  const svc = await services();
  const has = new Set((await all("SELECT service_id FROM client_services WHERE client_id = ?", c.id)).map((r) => r.service_id));

  return (
    <>
      <PageHead title="Edit" mark={c.name} />
      <div className="card" style={{ maxWidth: 720 }}>
        <form action={updateClient}>
          <Hidden id={c.id} />
          <div className="grid2">
            <div className="fld">
              <label htmlFor="name">Client name</label>
              <input id="name" name="name" type="text" required maxLength={120} defaultValue={c.name} />
            </div>
            <div className="fld">
              <label htmlFor="contact">Contact (person, phone)</label>
              <input id="contact" name="contact" type="text" maxLength={200} defaultValue={c.contact} />
            </div>
          </div>
          <span className="lbl">Services they have bought</span>
          <div className="checks">
            {svc.map((s) => (
              <label key={s.id}>
                <input type="checkbox" name="services" value={s.id} defaultChecked={has.has(s.id)} /> {s.name}
              </label>
            ))}
          </div>
          <div className="checks" style={{ gridTemplateColumns: "1fr" }}>
            <label>
              <input type="checkbox" name="active" defaultChecked={!!c.active} />
              Active client (untick when they stop working with Yenoh)
            </label>
          </div>
          <div className="acts">
            <button className="btn-sm">Save changes</button>
            <Link href="/clients" className="linkbtn">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  );
}
