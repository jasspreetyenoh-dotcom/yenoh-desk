import { all, get } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { today, fmtDate } from "@/lib/time";
import { TASK_SELECT, parseList } from "@/lib/queries";
import { checkIn, checkOut, startTask, toggleCheck, submitTask } from "@/app/actions";
import { PageHead, DueChip, Hidden } from "@/components/ui";

export const metadata = { title: "My Day · Yenoh Desk" };

export default async function MyDay() {
  const user = await requireUser();
  const t = today();
  const att = await get("SELECT * FROM attendance WHERE user_id = ? AND date = ?", user.id, t);
  const tasks = await all(`${TASK_SELECT} WHERE t.assignee_id = ? AND t.status != 'done' ORDER BY t.due, t.id`, user.id);
  const { n: doneToday } = await get("SELECT COUNT(*) n FROM tasks WHERE assignee_id = ? AND status = 'done' AND done_at = ?", user.id, t);

  return (
    <>
      <PageHead
        title="Hi"
        mark={user.name.split(" ")[0]}
        sub={`${fmtDate(t, { weekday: "long", day: "numeric", month: "long" })}${doneToday ? ` · ${doneToday} approved today` : ""}`}
      />

      <div className="stack" style={{ maxWidth: 760 }}>
        {user.role !== "owner" && (
          <div className="card checkin">
            <div>
              <h2 style={{ marginBottom: 2 }}>Attendance</h2>
              <span className="muted">{user.emp_type} · {user.work_mode === "WFH" ? "Working from home" : "Onsite"}</span>
            </div>
            <div className="acts">
              {att?.status === "leave" && <span className="chip yellow">On leave today</span>}
              {att?.in_time && <span className="chip green">In at {att.in_time}</span>}
              {att?.out_time && <span className="chip grey">Out at {att.out_time}</span>}
              {!att?.in_time && (
                <form action={checkIn}><button className="btn">Check in</button></form>
              )}
              {att?.in_time && !att?.out_time && (
                <form action={checkOut}><button className="btn-sm btn-white">Check out</button></form>
              )}
            </div>
          </div>
        )}

        <h2 style={{ marginBottom: 0 }}>My tasks ({tasks.length})</h2>
        {tasks.length === 0 && <div className="card empty">No open tasks. Nice work.</div>}

        {tasks.map((task) => {
          const list = parseList(task.checklist);
          const allDone = list.every((c) => c.done);
          return (
            <div className="card" key={task.id}>
              <div className="head">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{task.title}</div>
                  <div className="muted">{task.client} · {task.service} · via {task.source}</div>
                </div>
                <DueChip task={task} />
              </div>
              {task.details && <p style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{task.details}</p>}
              {task.note && <div className="note">Sent back: {task.note}</div>}

              {task.status === "todo" && (
                <form action={startTask} style={{ marginTop: 14 }}>
                  <Hidden id={task.id} />
                  <button className="btn-sm">Start</button>
                </form>
              )}

              {task.status === "doing" && (
                <>
                  {list.length > 0 && (
                    <div className="cl">
                      {list.map((c, i) => (
                        <form action={toggleCheck} key={i}>
                          <Hidden id={task.id} />
                          <input type="hidden" name="i" value={i} />
                          <button className={"check" + (c.done ? " on" : "")} aria-pressed={c.done} aria-label={c.t}>
                            {c.done ? "✓" : ""}
                          </button>
                          <span className={c.done ? "done" : ""}>{c.t}</span>
                        </form>
                      ))}
                    </div>
                  )}
                  <form action={submitTask}>
                    <Hidden id={task.id} />
                    <div className="fld">
                      <label htmlFor={`proof-${task.id}`}>Proof (link or short note)</label>
                      <input id={`proof-${task.id}`} name="proof" type="text" maxLength={500} defaultValue={task.proof} placeholder="Paste a link to the post, file or screenshot" />
                    </div>
                    <div className="acts">
                      <button className="btn-sm" disabled={!allDone}>Submit for review</button>
                      {!allDone && <span className="muted">Finish the checklist first</span>}
                    </div>
                  </form>
                </>
              )}

              {task.status === "review" && (
                <div style={{ marginTop: 14 }}><span className="chip soft">Sent for review</span></div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
