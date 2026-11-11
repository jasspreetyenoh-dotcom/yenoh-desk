import { today, diffDays, fmtDate } from "@/lib/time";

export const STATUS = { todo: "To do", doing: "In progress", review: "In review", done: "Done" };

// Page title with the yellow marker swipe from yenoh.in on the last word.
export function PageHead({ title, mark, sub, children }) {
  return (
    <div className="head">
      <div>
        <h1>
          {title} {mark && <span className="mark">{mark}</span>}
        </h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function DueChip({ task }) {
  if (task.status === "done") return <span className="chip green">Done</span>;
  const d = diffDays(task.due, today());
  if (d < 0) return <span className="chip red">Overdue {-d} {d === -1 ? "day" : "days"}</span>;
  if (d === 0) return <span className="chip yellow">Due today</span>;
  if (d === 1) return <span className="chip soft">Due tomorrow</span>;
  return <span className="chip">Due {fmtDate(task.due)}</span>;
}

export function TodayChip({ att }) {
  if (att?.status === "leave") return <span className="chip yellow">On leave</span>;
  if (att?.out_time) return <span className="chip grey">Left at {att.out_time}</span>;
  if (att?.in_time) return <span className="chip green">In at {att.in_time}</span>;
  if (att?.status === "present") return <span className="chip green">Present</span>;
  return <span className="chip red">Not checked in</span>;
}

export function Hidden({ id }) {
  return <input type="hidden" name="id" value={id} />;
}
