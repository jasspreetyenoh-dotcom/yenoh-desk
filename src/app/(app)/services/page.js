import { requireOwner } from "@/lib/auth";
import { services, parseList } from "@/lib/queries";
import { updateService, createService } from "@/app/config-actions";
import { PageHead, Hidden } from "@/components/ui";

export const metadata = { title: "Services · Yenoh Desk" };

const ERRORS = {
  name: "Enter a name for the service.",
  duplicate: "A service with that name already exists.",
};

export default async function ServicesPage({ searchParams }) {
  await requireOwner();
  const { error, saved, added } = await searchParams;
  const list = await services();

  return (
    <>
      <PageHead
        title="Services &"
        mark="checklists"
        sub="Each service has a checklist. A team member must tick every line before they can submit work. One line per step."
      />
      {added && <div className="msg ok">Service added.</div>}
      {ERRORS[error] && <div className="msg err">{ERRORS[error]}</div>}
      <p className="muted" style={{ marginBottom: 16 }}>Changes apply to new tasks. Tasks that already exist keep the checklist they started with.</p>

      <div className="stack" style={{ maxWidth: 760 }}>
        {list.map((s) => (
          <div className="card" key={s.id}>
            <form action={updateService}>
              <Hidden id={s.id} />
              <div className="fld">
                <label htmlFor={`name-${s.id}`}>Service name</label>
                <input id={`name-${s.id}`} name="name" type="text" required maxLength={80} defaultValue={s.name} />
              </div>
              <div className="fld">
                <label htmlFor={`cl-${s.id}`}>Checklist (one step per line)</label>
                <textarea id={`cl-${s.id}`} name="checklist" style={{ minHeight: 110 }} defaultValue={parseList(s.checklist).join("\n")} />
              </div>
              <div className="acts">
                <button className="btn-sm">Save</button>
                {String(saved) === String(s.id) && <span className="chip green">Saved</span>}
              </div>
            </form>
          </div>
        ))}

        <div className="card">
          <h2>Add a service</h2>
          <form action={createService}>
            <div className="fld">
              <label htmlFor="new-name">Service name</label>
              <input id="new-name" name="name" type="text" required maxLength={80} />
            </div>
            <div className="fld">
              <label htmlFor="new-cl">Checklist (one step per line)</label>
              <textarea id="new-cl" name="checklist" style={{ minHeight: 90 }} />
            </div>
            <button className="btn">Add service</button>
          </form>
        </div>
      </div>
    </>
  );
}
