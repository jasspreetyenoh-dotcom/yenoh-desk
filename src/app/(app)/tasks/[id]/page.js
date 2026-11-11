import Link from "next/link";
import { notFound } from "next/navigation";
import { get } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { fmtDate } from "@/lib/time";
import { TASK_SELECT, parseList, activeUsers } from "@/lib/queries";
import { approveTask, sendBackTask, updateTask, deleteTask } from "@/app/actions";
import { PageHead, DueChip, Hidden, STATUS } from "@/components/ui";
import ConfirmButton from "@/components/ConfirmButton";

export const metadata = { title: "Task · Yenoh Desk" };

export default async function TaskPage({ params, searchParams }) {
  await requireManager();
  const { id } = await params;
  const { saved, error } = await searchParams;
  const task = await get(`${TASK_SELECT} WHERE t.id = ?`, Number(id) || 0);
  if (!task) notFound();
  const users = await activeUsers();
  const list = parseList(task.checklist);
  const isLink = /^https?:\/\//i.test(task.proof);

  return (
    <>
      <PageHead title={task.title} sub={`${task.client} · ${task.service} · came from ${task.source} · created ${fmtDate(task.created_at)}`}>
        <div className="chips">
          <span className="chip soft">{STATUS[task.status]}</span>
          <DueChip task={task} />
        </div>
      </PageHead>

      {saved && <div className="msg ok">Saved.</div>}
      {error && <div className="msg err">Check the title, person and due date.</div>}

      <div className="cols2">
        <div className="stack">
          {task.status === "review" && (
            <div className="card">
              <h2>Review this work</h2>
              {task.proof ? (
                <p style={{ marginBottom: 14 }}>
                  <span className="lbl">Proof from {task.assignee}</span>
                  {isLink
                    ? <a href={task.proof} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", wordBreak: "break-all" }}>{task.proof}</a>
                    : <span style={{ wordBreak: "break-word" }}>{task.proof}</span>}
                </p>
              ) : (
                <p className="muted" style={{ marginBottom: 14 }}>No proof link or note was added.</p>
              )}
              <form action={approveTask} style={{ marginBottom: 18 }}>
                <Hidden id={task.id} />
                <button className="btn">Approve</button>
              </form>
              <form action={sendBackTask}>
                <Hidden id={task.id} />
                <div className="fld">
                  <label htmlFor="note">What needs fixing?</label>
                  <textarea id="note" name="note" maxLength={500} placeholder="Tell them what to change" />
                </div>
                <button className="btn-sm btn-white">Send back</button>
              </form>
            </div>
          )}

          <div className="card">
            <h2>Edit task</h2>
            <form action={updateTask}>
              <Hidden id={task.id} />
              <div className="fld">
                <label htmlFor="title">Title</label>
                <input id="title" name="title" type="text" required maxLength={160} defaultValue={task.title} />
              </div>
              <div className="fld">
                <label htmlFor="details">Details</label>
                <textarea id="details" name="details" maxLength={1000} defaultValue={task.details} />
              </div>
              <div className="grid2">
                <div className="fld">
                  <label htmlFor="assignee_id">Assigned to</label>
                  <select id="assignee_id" name="assignee_id" defaultValue={task.assignee_id}>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="fld">
                  <label htmlFor="due">Due date</label>
                  <input id="due" name="due" type="date" required defaultValue={task.due} />
                </div>
              </div>
              <button className="btn-sm">Save changes</button>
            </form>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h2>Checklist</h2>
            {list.length === 0 && <div className="empty">No checklist for this service.</div>}
            {list.map((c, i) => (
              <div className="row" key={i}>
                <span>{c.t}</span>
                <span className={"chip " + (c.done ? "green" : "grey")}>{c.done ? "Done" : "Not yet"}</span>
              </div>
            ))}
            {task.note && <div className="note">Sent back: {task.note}</div>}
          </div>

          <div className="card">
            <h2>Delete task</h2>
            <p className="muted" style={{ marginBottom: 12 }}>This removes the task for good. It cannot be undone.</p>
            <form action={deleteTask}>
              <Hidden id={task.id} />
              <ConfirmButton className="btn-sm btn-danger" message="Delete this task for good? This cannot be undone.">
                Delete this task
              </ConfirmButton>
            </form>
          </div>

          <Link href="/tasks" className="linkbtn">Back to all tasks</Link>
        </div>
      </div>
    </>
  );
}
