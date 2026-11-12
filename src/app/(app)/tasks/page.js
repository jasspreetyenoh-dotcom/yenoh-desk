import Link from "next/link";
import { all } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { today, addDays } from "@/lib/time";
import { TASK_SELECT, activeUsers, activeClients } from "@/lib/queries";
import { approveTask, sendBackTask } from "@/app/actions";
import { PageHead, DueChip, Hidden, STATUS } from "@/components/ui";

export const metadata = { title: "Tasks · Yenoh Desk" };

export default async function TasksPage({ searchParams }) {
  await requireManager();
  const sp = await searchParams;
  const client = Number(sp.client) || 0;
  const person = Number(sp.person) || 0;

  // Finished tasks stay on the board for 14 days, then drop off.
  const where = ["(t.status != 'done' OR t.done_at >= ?)"];
  const params = [addDays(today(), -14)];
  if (client) { where.push("t.client_id = ?"); params.push(client); }
  if (person) { where.push("t.assignee_id = ?"); params.push(person); }

  const [tasks, clients, users] = await Promise.all([
    all(`${TASK_SELECT} WHERE ${where.join(" AND ")} ORDER BY t.due, t.id`, ...params),
    activeClients(),
    activeUsers(),
  ]);

  return (
    <>
      <PageHead title="All" mark="tasks" sub="Every client request becomes a task with an owner and a due date.">
        <Link href="/tasks/new" className="btn">+ New task</Link>
      </PageHead>

      <form className="bar" method="get">
        <select name="client" defaultValue={client || ""} aria-label="Filter by client">
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="person" defaultValue={person || ""} aria-label="Filter by person">
          <option value="">Everyone</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <button className="btn-sm btn-white">Filter</button>
        {(client || person) ? <Link href="/tasks" className="linkbtn">Clear</Link> : null}
      </form>

      <div className="board">
        {Object.keys(STATUS).map((s) => {
          const items = tasks.filter((x) => x.status === s);
          return (
            <div className="col" key={s}>
              <h3><span>{STATUS[s]}</span><span>{items.length}</span></h3>
              {items.length === 0 && <div className="empty">No tasks</div>}
              {items.map((task) => (
                <div className="tk" key={task.id}>
                  <Link href={`/tasks/${task.id}`} className="t" style={{ display: "block" }}>{task.title}</Link>
                  <div className="muted">{task.client} · {task.service}</div>
                  <div className="f">
                    <span className="muted">{task.assignee}</span>
                    <DueChip task={task} />
                  </div>
                  {s === "review" && (
                    <div className="acts" style={{ marginTop: 10 }}>
                      <form action={approveTask}><Hidden id={task.id} /><button className="btn-sm">Approve</button></form>
                      <form action={sendBackTask}><Hidden id={task.id} /><button className="btn-sm btn-white">Send back</button></form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
