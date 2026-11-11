"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, get, run } from "@/lib/db";
import {
  createSession, destroySession, hashPassword, verifyPassword,
  requireUser, requireManager, requireOwner,
} from "@/lib/auth";
import { today, nowTime, isDate } from "@/lib/time";
import { parseList } from "@/lib/queries";

const ROLES = ["member", "lead"];
const TYPES = ["Full-time", "Part-time", "Intern"];
const MODES = ["Onsite", "WFH"];
const SOURCES = ["WhatsApp", "Call", "Email", "Internal"];

const str = (fd, k, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const int = (fd, k) => {
  const n = Number(fd.get(k));
  return Number.isInteger(n) && n > 0 ? n : 0;
};
const pick = (v, list) => (list.includes(v) ? v : list[0]);
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const refresh = () => revalidatePath("/", "layout");

/* ---------------- Login ---------------- */

// Slows down password guessing: 5 wrong tries per email, then a 5 minute wait.
// Kept in the database (not memory) so it holds even when the app runs on several servers.
const WINDOW = 5 * 60 * 1000;
async function blocked(email) {
  const r = await get("SELECT count, last FROM login_attempts WHERE email = ?", email);
  if (!r) return false;
  if (Date.now() - r.last > WINDOW) {
    await run("DELETE FROM login_attempts WHERE email = ?", email);
    return false;
  }
  return r.count >= 5;
}
async function recordFailure(email) {
  await run(
    `INSERT INTO login_attempts(email, count, last) VALUES(?, 1, ?)
     ON CONFLICT(email) DO UPDATE SET count = login_attempts.count + 1, last = excluded.last`,
    email, Date.now()
  );
}

export async function setupOwner(fd) {
  const existing = await get("SELECT COUNT(*) n FROM users");
  if (existing.n > 0) redirect("/login");
  const name = str(fd, "name", 80);
  const email = str(fd, "email", 120).toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!name || !validEmail(email)) redirect("/setup?error=details");
  if (password.length < 8) redirect("/setup?error=password");
  const r = await run(
    "INSERT INTO users(name, email, pass_hash, role, job_title, created_at) VALUES(?,?,?,?,?,?)",
    name, email, hashPassword(password), "owner", "Owner", today()
  );
  await createSession(r.id);
  redirect("/dashboard");
}

export async function login(fd) {
  const email = str(fd, "email", 120).toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (await blocked(email)) redirect("/login?error=wait");
  const u = await get("SELECT id, pass_hash FROM users WHERE email = ? AND active = 1", email);
  if (!u || !verifyPassword(password, u.pass_hash)) {
    await recordFailure(email);
    redirect("/login?error=wrong");
  }
  await run("DELETE FROM login_attempts WHERE email = ?", email);
  await createSession(u.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function changePassword(fd) {
  const user = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const row = await get("SELECT pass_hash FROM users WHERE id = ?", user.id);
  if (!verifyPassword(current, row.pass_hash)) redirect("/account?error=current");
  if (next.length < 8) redirect("/account?error=short");
  await run("UPDATE users SET pass_hash = ? WHERE id = ?", hashPassword(next), user.id);
  await run("DELETE FROM sessions WHERE user_id = ?", user.id);
  await createSession(user.id);
  redirect("/account?ok=1");
}

/* ---------------- Attendance ---------------- */

export async function checkIn() {
  const user = await requireUser();
  await run(
    `INSERT INTO attendance(user_id, date, status, in_time) VALUES(?,?,'present',?)
     ON CONFLICT(user_id, date) DO UPDATE SET status = 'present', in_time = excluded.in_time
     WHERE attendance.in_time = ''`,
    user.id, today(), nowTime()
  );
  refresh();
}

export async function checkOut() {
  const user = await requireUser();
  await run(
    "UPDATE attendance SET out_time = ? WHERE user_id = ? AND date = ? AND in_time != '' AND out_time = ''",
    nowTime(), user.id, today()
  );
  refresh();
}

export async function markAttendance(fd) {
  await requireManager();
  const userId = int(fd, "user_id");
  const date = str(fd, "date", 10);
  const value = str(fd, "value", 10);
  if (!userId || !isDate(date) || date > today()) redirect("/attendance?error=1");
  if (value === "absent") {
    await run("DELETE FROM attendance WHERE user_id = ? AND date = ?", userId, date);
  } else {
    const status = value === "leave" ? "leave" : "present";
    await run(
      `INSERT INTO attendance(user_id, date, status) VALUES(?,?,?)
       ON CONFLICT(user_id, date) DO UPDATE SET status = excluded.status`,
      userId, date, status
    );
  }
  refresh();
}

/* ---------------- Tasks ---------------- */

export async function createTask(fd) {
  const user = await requireManager();
  const title = str(fd, "title", 160);
  const due = str(fd, "due", 10);
  const client = await get("SELECT id FROM clients WHERE id = ? AND active = 1", int(fd, "client_id"));
  const service = await get("SELECT id, checklist FROM services WHERE id = ?", int(fd, "service_id"));
  const assignee = await get("SELECT id FROM users WHERE id = ? AND active = 1", int(fd, "assignee_id"));
  if (!title || !client || !service || !assignee || !isDate(due)) redirect("/tasks/new?error=1");
  const checklist = parseList(service.checklist).map((t) => ({ t, done: false }));
  await run(
    `INSERT INTO tasks(title, details, client_id, service_id, assignee_id, created_by, due, source, checklist, created_at)
     VALUES(?,?,?,?,?,?,?,?,?,?)`,
    title, str(fd, "details", 1000), client.id, service.id, assignee.id, user.id, due,
    pick(str(fd, "source", 20), SOURCES), JSON.stringify(checklist), today()
  );
  refresh();
  redirect("/tasks");
}

// A team member may only touch tasks assigned to them.
async function ownTask(fd) {
  const user = await requireUser();
  const task = await get("SELECT * FROM tasks WHERE id = ? AND assignee_id = ?", int(fd, "id"), user.id);
  return task;
}

export async function startTask(fd) {
  const task = await ownTask(fd);
  if (task && task.status === "todo") await run("UPDATE tasks SET status = 'doing' WHERE id = ?", task.id);
  refresh();
}

export async function toggleCheck(fd) {
  const task = await ownTask(fd);
  if (task && task.status === "doing") {
    const list = parseList(task.checklist);
    const i = Number(fd.get("i"));
    if (list[i]) {
      list[i].done = !list[i].done;
      await run("UPDATE tasks SET checklist = ? WHERE id = ?", JSON.stringify(list), task.id);
    }
  }
  refresh();
}

export async function submitTask(fd) {
  const task = await ownTask(fd);
  if (task && task.status === "doing" && parseList(task.checklist).every((c) => c.done)) {
    await run("UPDATE tasks SET status = 'review', note = '', proof = ? WHERE id = ?", str(fd, "proof", 500), task.id);
  }
  refresh();
}

export async function approveTask(fd) {
  await requireManager();
  await run("UPDATE tasks SET status = 'done', note = '', done_at = ? WHERE id = ? AND status = 'review'", today(), int(fd, "id"));
  refresh();
}

export async function sendBackTask(fd) {
  await requireManager();
  const note = str(fd, "note", 500) || "Sent back after review. Please fix and submit again.";
  const task = await get("SELECT id, checklist FROM tasks WHERE id = ? AND status = 'review'", int(fd, "id"));
  if (task) {
    // Untick the checklist so the work is checked again before it is resubmitted.
    const list = parseList(task.checklist).map((c) => ({ ...c, done: false }));
    await run("UPDATE tasks SET status = 'doing', note = ?, checklist = ? WHERE id = ?", note, JSON.stringify(list), task.id);
  }
  refresh();
}

export async function updateTask(fd) {
  await requireManager();
  const id = int(fd, "id");
  const title = str(fd, "title", 160);
  const due = str(fd, "due", 10);
  const assignee = await get("SELECT id FROM users WHERE id = ? AND active = 1", int(fd, "assignee_id"));
  if (!id || !title || !assignee || !isDate(due)) redirect(`/tasks/${id}?error=1`);
  await run(
    "UPDATE tasks SET title = ?, details = ?, assignee_id = ?, due = ? WHERE id = ?",
    title, str(fd, "details", 1000), assignee.id, due, id
  );
  refresh();
  redirect(`/tasks/${id}?saved=1`);
}

export async function deleteTask(fd) {
  await requireManager();
  await run("DELETE FROM tasks WHERE id = ?", int(fd, "id"));
  refresh();
  redirect("/tasks");
}

/* ---------------- Team (owner only) ---------------- */

export async function createMember(fd) {
  await requireOwner();
  const name = str(fd, "name", 80);
  const email = str(fd, "email", 120).toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!name || !validEmail(email)) redirect("/team?error=details");
  if (password.length < 8) redirect("/team?error=password");
  if (await get("SELECT id FROM users WHERE email = ?", email)) redirect("/team?error=email");
  await run(
    `INSERT INTO users(name, email, pass_hash, role, job_title, emp_type, work_mode, created_at)
     VALUES(?,?,?,?,?,?,?,?)`,
    name, email, hashPassword(password), pick(str(fd, "role"), ROLES), str(fd, "job_title", 80),
    pick(str(fd, "emp_type"), TYPES), pick(str(fd, "work_mode"), MODES), today()
  );
  refresh();
  redirect("/team?added=1");
}

export async function updateMember(fd) {
  const owner = await requireOwner();
  const id = int(fd, "id");
  const target = await get("SELECT id, role FROM users WHERE id = ?", id);
  const name = str(fd, "name", 80);
  if (!target || !name) redirect("/team");
  const isSelf = target.id === owner.id;
  const role = target.role === "owner" ? "owner" : pick(str(fd, "role"), ROLES);
  const active = isSelf || fd.get("active") === "on" ? 1 : 0;
  await run(
    "UPDATE users SET name = ?, role = ?, job_title = ?, emp_type = ?, work_mode = ?, active = ? WHERE id = ?",
    name, role, str(fd, "job_title", 80), pick(str(fd, "emp_type"), TYPES), pick(str(fd, "work_mode"), MODES), active, id
  );
  if (!active) await run("DELETE FROM sessions WHERE user_id = ?", id);
  refresh();
  redirect(`/team/${id}?saved=1`);
}

export async function resetPassword(fd) {
  const owner = await requireOwner();
  const id = int(fd, "id");
  const password = String(fd.get("password") ?? "");
  if (!id || id === owner.id) redirect("/team");
  if (password.length < 8) redirect(`/team/${id}?error=password`);
  await run("UPDATE users SET pass_hash = ? WHERE id = ?", hashPassword(password), id);
  await run("DELETE FROM sessions WHERE user_id = ?", id);
  redirect(`/team/${id}?reset=1`);
}

/* ---------------- Clients ---------------- */

async function saveClientServices(clientId, fd) {
  const valid = new Set((await all("SELECT id FROM services")).map((s) => s.id));
  await run("DELETE FROM client_services WHERE client_id = ?", clientId);
  for (const raw of fd.getAll("services")) {
    const sid = Number(raw);
    if (valid.has(sid)) await run("INSERT OR IGNORE INTO client_services(client_id, service_id) VALUES(?,?)", clientId, sid);
  }
}

export async function createClient(fd) {
  await requireManager();
  const name = str(fd, "name", 120);
  if (!name) redirect("/clients?error=1");
  const r = await run("INSERT INTO clients(name, contact, created_at) VALUES(?,?,?)", name, str(fd, "contact", 200), today());
  await saveClientServices(r.id, fd);
  refresh();
  redirect("/clients");
}

export async function updateClient(fd) {
  await requireManager();
  const id = int(fd, "id");
  const name = str(fd, "name", 120);
  if (!id || !name) redirect("/clients");
  await run(
    "UPDATE clients SET name = ?, contact = ?, active = ? WHERE id = ?",
    name, str(fd, "contact", 200), fd.get("active") === "on" ? 1 : 0, id
  );
  await saveClientServices(id, fd);
  refresh();
  redirect("/clients");
}
