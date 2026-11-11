import Link from "next/link";
import { all } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { today } from "@/lib/time";
import { createMember } from "@/app/actions";
import { PageHead, TodayChip } from "@/components/ui";

export const metadata = { title: "Team · Yenoh Desk" };

const ERRORS = {
  details: "Enter a name and a valid email.",
  password: "The password must be at least 8 characters.",
  email: "Someone already uses that email.",
};
const ROLE = { owner: "Owner", lead: "Lead", member: "Member" };

export default async function TeamPage({ searchParams }) {
  const me = await requireManager();
  const { error, added } = await searchParams;
  const t = today();
  const people = await all(
    `SELECT u.*, a.status, a.in_time, a.out_time,
       (SELECT COUNT(*) FROM tasks k WHERE k.assignee_id = u.id AND k.status != 'done') AS open,
       (SELECT COUNT(*) FROM tasks k WHERE k.assignee_id = u.id AND k.status != 'done' AND k.due < ?) AS overdue
     FROM users u LEFT JOIN attendance a ON a.user_id = u.id AND a.date = ?
     ORDER BY u.active DESC, u.name`,
    t, t
  );
  const isOwner = me.role === "owner";

  return (
    <>
      <PageHead title="The" mark="team" sub="Who is working, how, and how much they have on their plate." />
      {added && <div className="msg ok">Team member added. Share their email and password with them.</div>}
      {ERRORS[error] && <div className="msg err">{ERRORS[error]}</div>}

      <div className="stack">
        <div className="card scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Job</th><th>Access</th><th>Type</th><th>Works from</th><th>Today</th><th>Open</th><th>Overdue</th>
                {isOwner && <th></th>}
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} style={p.active ? undefined : { opacity: 0.5 }}>
                  <td><b>{p.name}</b><br /><span className="muted">{p.email}</span></td>
                  <td>{p.job_title || "–"}</td>
                  <td>{ROLE[p.role]}</td>
                  <td>{p.role === "owner" ? "–" : p.emp_type}</td>
                  <td>{p.role === "owner" ? "–" : p.work_mode}</td>
                  <td>
                    {!p.active ? <span className="chip grey">Deactivated</span> : p.role === "owner" ? "–" : <TodayChip att={p} />}
                  </td>
                  <td>{p.open}</td>
                  <td>{p.overdue ? <span className="chip red">{p.overdue}</span> : 0}</td>
                  {isOwner && <td><Link href={`/team/${p.id}`} className="btn-sm btn-white">Edit</Link></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isOwner && (
          <div className="card" style={{ maxWidth: 720 }}>
            <h2>Add a team member</h2>
            <form action={createMember}>
              <div className="grid2">
                <div className="fld">
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" type="text" required maxLength={80} />
                </div>
                <div className="fld">
                  <label htmlFor="job_title">Job</label>
                  <input id="job_title" name="job_title" type="text" maxLength={80} placeholder="e.g. Video Editor" />
                </div>
                <div className="fld">
                  <label htmlFor="email">Email (used to log in)</label>
                  <input id="email" name="email" type="email" required autoComplete="off" />
                </div>
                <div className="fld">
                  <label htmlFor="password">Starting password (8+ characters)</label>
                  <input id="password" name="password" type="text" required minLength={8} autoComplete="off" />
                </div>
                <div className="fld">
                  <label htmlFor="emp_type">Type</label>
                  <select id="emp_type" name="emp_type">
                    <option>Full-time</option><option>Part-time</option><option>Intern</option>
                  </select>
                </div>
                <div className="fld">
                  <label htmlFor="work_mode">Works from</label>
                  <select id="work_mode" name="work_mode">
                    <option value="Onsite">Onsite</option><option value="WFH">Home (WFH)</option>
                  </select>
                </div>
                <div className="fld">
                  <label htmlFor="role">Access</label>
                  <select id="role" name="role">
                    <option value="member">Member: sees only their own tasks</option>
                    <option value="lead">Lead: assigns and reviews work</option>
                  </select>
                </div>
              </div>
              <button className="btn">Add member</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
