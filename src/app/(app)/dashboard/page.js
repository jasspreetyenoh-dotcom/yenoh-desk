import Link from "next/link";
import { all } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { today, fmtDate } from "@/lib/time";
import { TASK_SELECT } from "@/lib/queries";
import { approveTask, sendBackTask } from "@/app/actions";
import { PageHead, DueChip, TodayChip, Hidden } from "@/components/ui";

export const metadata = { title: "Dashboard · Yenoh Desk" };

export default async function Dashboard() {
  await requireManager();
  const t = today();
  // The four questions below are asked together, not one after another.
  const pOverdue = all(`${TASK_SELECT} WHERE t.status != 'done' AND t.due < ? ORDER BY t.due`, t);
  const pDue = all(`${TASK_SELECT} WHERE t.status != 'done' AND t.due = ? ORDER BY t.id`, t);
  const pReview = all(`${TASK_SELECT} WHERE t.status = 'review' ORDER BY t.due`);
  const pTeam = all(
    `SELECT u.id, u.name, u.job_title, u.emp_type, u.work_mode, a.status, a.in_time, a.out_time
     FROM users u LEFT JOIN attendance a ON a.user_id = u.id AND a.date = ?
     WHERE u.active = 1 AND u.role != 'owner' ORDER BY u.name`,
    t
  );
  const [overdue, dueToday, review, team] = await Promise.all([pOverdue, pDue, pReview, pTeam]);
  const notIn = team.filter((m) => m.status !== "present").length;

  return (
    <>
      <PageHead
        title="Today at"
        mark="Yenoh"
        sub={`${fmtDate(t, { weekday: "long", day: "numeric", month: "long" })} · everything that needs your attention.`}
      >
        <Link href="/tasks/new" className="btn">+ New task</Link>
      </PageHead>

      <div className="tiles">
        <div className={"tile" + (overdue.length ? " bad" : "")}>
          <div className="n">{overdue.length}</div>
          <div className="l">Overdue tasks</div>
        </div>
        <div className="tile hot">
          <div className="n">{dueToday.length}</div>
          <div className="l">Due today</div>
        </div>
        <div className="tile">
          <div className="n">{review.length}</div>
          <div className="l">Waiting for review</div>
        </div>
        <div className="tile">
          <div className="n">{notIn}</div>
          <div className="l">Not in / on leave</div>
        </div>
      </div>

      <div className="cols2">
        <div className="stack">
          <div className="card">
            <h2>Waiting for your review</h2>
            {review.length === 0 && <div className="empty">Nothing to review.</div>}
            {review.map((task) => (
              <div className="row" key={task.id}>
                <div>
                  <Link href={`/tasks/${task.id}`} className="t">{task.title}</Link>
                  <div className="muted">{task.client} · {task.service} · by {task.assignee}</div>
                </div>
                <div className="acts">
                  <form action={approveTask}><Hidden id={task.id} /><button className="btn-sm">Approve</button></form>
                  <form action={sendBackTask}><Hidden id={task.id} /><button className="btn-sm btn-white">Send back</button></form>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>Overdue</h2>
            {overdue.length === 0 && <div className="empty">Nothing is overdue.</div>}
            {overdue.map((task) => (
              <div className="row" key={task.id}>
                <div>
                  <Link href={`/tasks/${task.id}`} className="t">{task.title}</Link>
                  <div className="muted">{task.client} · {task.service} · {task.assignee}</div>
                </div>
                <DueChip task={task} />
              </div>
            ))}
          </div>

          <div className="card">
            <h2>Due today</h2>
            {dueToday.length === 0 && <div className="empty">Nothing is due today.</div>}
            {dueToday.map((task) => (
              <div className="row" key={task.id}>
                <div>
                  <Link href={`/tasks/${task.id}`} className="t">{task.title}</Link>
                  <div className="muted">{task.client} · {task.service} · {task.assignee}</div>
                </div>
                <span className="chip">{{ todo: "To do", doing: "In progress", review: "In review" }[task.status]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Team today</h2>
          {team.length === 0 && (
            <div className="empty">No team members yet. <Link href="/team" style={{ textDecoration: "underline" }}>Add your team</Link>.</div>
          )}
          {team.map((m) => (
            <div className="row" key={m.id}>
              <div>
                <div className="t">{m.name}</div>
                <div className="muted">{[m.job_title, m.emp_type, m.work_mode].filter(Boolean).join(" · ")}</div>
              </div>
              <TodayChip att={m} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
