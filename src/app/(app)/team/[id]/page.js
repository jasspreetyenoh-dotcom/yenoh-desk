import Link from "next/link";
import { notFound } from "next/navigation";
import { get } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { updateMember, resetPassword } from "@/app/actions";
import { PageHead, Hidden } from "@/components/ui";

export const metadata = { title: "Edit member · Yenoh Desk" };

export default async function MemberPage({ params, searchParams }) {
  const me = await requireOwner();
  const { id } = await params;
  const { saved, reset, error } = await searchParams;
  const p = await get("SELECT * FROM users WHERE id = ?", Number(id) || 0);
  if (!p) notFound();
  const isSelf = p.id === me.id;

  return (
    <>
      <PageHead title="Edit" mark={p.name} sub={p.email} />
      {saved && <div className="msg ok">Saved.</div>}
      {reset && <div className="msg ok">Password changed. They have been logged out everywhere.</div>}
      {error && <div className="msg err">The password must be at least 8 characters.</div>}

      <div className="cols2">
        <div className="card">
          <h2>Details</h2>
          <form action={updateMember}>
            <Hidden id={p.id} />
            <div className="grid2">
              <div className="fld">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" type="text" required maxLength={80} defaultValue={p.name} />
              </div>
              <div className="fld">
                <label htmlFor="job_title">Job</label>
                <input id="job_title" name="job_title" type="text" maxLength={80} defaultValue={p.job_title} />
              </div>
              <div className="fld">
                <label htmlFor="emp_type">Type</label>
                <select id="emp_type" name="emp_type" defaultValue={p.emp_type}>
                  <option>Full-time</option><option>Part-time</option><option>Intern</option>
                </select>
              </div>
              <div className="fld">
                <label htmlFor="work_mode">Works from</label>
                <select id="work_mode" name="work_mode" defaultValue={p.work_mode}>
                  <option value="Onsite">Onsite</option><option value="WFH">Home (WFH)</option>
                </select>
              </div>
              {p.role !== "owner" && (
                <div className="fld">
                  <label htmlFor="role">Access</label>
                  <select id="role" name="role" defaultValue={p.role}>
                    <option value="member">Member: sees only their own tasks</option>
                    <option value="lead">Lead: assigns and reviews work</option>
                  </select>
                </div>
              )}
            </div>
            {!isSelf && (
              <div className="checks" style={{ gridTemplateColumns: "1fr" }}>
                <label>
                  <input type="checkbox" name="active" defaultChecked={!!p.active} />
                  Active (untick when they leave: they can no longer log in)
                </label>
              </div>
            )}
            <button className="btn-sm">Save changes</button>
          </form>
        </div>

        <div className="stack">
          {isSelf ? (
            <div className="card">
              <h2>Password</h2>
              <p>Change your own password on the <Link href="/account" style={{ textDecoration: "underline" }}>Account</Link> page.</p>
            </div>
          ) : (
            <div className="card">
              <h2>Reset password</h2>
              <form action={resetPassword}>
                <Hidden id={p.id} />
                <div className="fld">
                  <label htmlFor="password">New password (8+ characters)</label>
                  <input id="password" name="password" type="text" required minLength={8} autoComplete="off" />
                </div>
                <button className="btn-sm btn-white">Set new password</button>
              </form>
            </div>
          )}
          <Link href="/team" className="linkbtn">Back to team</Link>
        </div>
      </div>
    </>
  );
}
