"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { get, run } from "@/lib/db";
import { requireManager, requireOwner } from "@/lib/auth";
import { today } from "@/lib/time";
import { addDays } from "@/lib/time";
import { ensureRecurring } from "@/lib/recurring";

const str = (fd, k, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const int = (fd, k) => {
  const n = Number(fd.get(k));
  return Number.isInteger(n) && n > 0 ? n : 0;
};
const refresh = () => revalidatePath("/", "layout");

/* ---------------- Repeating tasks ---------------- */

export async function createRecurring(fd) {
  const user = await requireManager();
  const title = str(fd, "title", 160);
  const freq = ["daily", "weekly", "monthly"].includes(str(fd, "freq", 10)) ? str(fd, "freq", 10) : "daily";
  const weekday = Number(fd.get("weekday"));
  const monthDay = int(fd, "month_day");
  const client = await get("SELECT id FROM clients WHERE id = ? AND active = 1", int(fd, "client_id"));
  const service = await get("SELECT id FROM services WHERE id = ?", int(fd, "service_id"));
  const assignee = await get("SELECT id FROM users WHERE id = ? AND active = 1", int(fd, "assignee_id"));
  if (!title || !client || !service || !assignee) redirect("/recurring?error=1");
  if (freq === "weekly" && !(Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)) redirect("/recurring?error=1");
  if (freq === "monthly" && !(monthDay >= 1 && monthDay <= 31)) redirect("/recurring?error=1");

  await run(
    `INSERT INTO recurring(title, details, client_id, service_id, assignee_id, created_by, freq, weekday, month_day, last_run, created_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    title, str(fd, "details", 1000), client.id, service.id, assignee.id, user.id, freq,
    Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : 1, monthDay || 1,
    addDays(today(), -1), today()
  );
  await ensureRecurring(); // so a rule that is due today shows up straight away
  refresh();
  redirect("/recurring?added=1");
}

export async function toggleRecurring(fd) {
  await requireManager();
  const id = int(fd, "id");
  // When resumed, start counting from today so a long pause does not create a backlog.
  await run(
    "UPDATE recurring SET active = 1 - active, last_run = CASE WHEN active = 0 THEN ? ELSE last_run END WHERE id = ?",
    addDays(today(), -1), id
  );
  await ensureRecurring();
  refresh();
}

export async function deleteRecurring(fd) {
  await requireManager();
  const id = int(fd, "id");
  await run("DELETE FROM recurring WHERE id = ?", id);
  // Tasks it already created stay, but stop being marked as repeating.
  await run("UPDATE tasks SET recurring_id = NULL WHERE recurring_id = ?", id);
  refresh();
}

/* ---------------- Services and checklists (owner only) ---------------- */

function checklistFrom(fd) {
  return String(fd.get("checklist") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 20);
}

export async function updateService(fd) {
  await requireOwner();
  const id = int(fd, "id");
  const name = str(fd, "name", 80);
  if (!id || !name) redirect("/services?error=name");
  if (await get("SELECT id FROM services WHERE name = ? AND id != ?", name, id)) redirect("/services?error=duplicate");
  await run("UPDATE services SET name = ?, checklist = ? WHERE id = ?", name, JSON.stringify(checklistFrom(fd)), id);
  refresh();
  redirect(`/services?saved=${id}`);
}

export async function createService(fd) {
  await requireOwner();
  const name = str(fd, "name", 80);
  if (!name) redirect("/services?error=name");
  if (await get("SELECT id FROM services WHERE name = ?", name)) redirect("/services?error=duplicate");
  const { m } = await get("SELECT COALESCE(MAX(sort), -1) m FROM services");
  await run("INSERT INTO services(name, checklist, sort) VALUES(?,?,?)", name, JSON.stringify(checklistFrom(fd)), m + 1);
  refresh();
  redirect("/services?added=1");
}
