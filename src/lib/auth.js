import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, run } from "./db";

const COOKIE = "yenoh_desk_session";
const DAYS = 30;
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return salt.toString("hex") + ":" + crypto.scryptSync(pw, salt, 64).toString("hex");
}
export function verifyPassword(pw, stored) {
  const [s, h] = String(stored).split(":");
  if (!s || !h) return false;
  const a = Buffer.from(h, "hex");
  const b = crypto.scryptSync(pw, Buffer.from(s, "hex"), 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + DAYS * 864e5;
  await run("DELETE FROM sessions WHERE expires_at < ?", Date.now());
  await run("INSERT INTO sessions(token_hash, user_id, expires_at) VALUES(?,?,?)", sha(token), userId, expires);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}
export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE token_hash = ?", sha(token));
  store.delete(COOKIE);
}

export const currentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return get(
    `SELECT u.id, u.name, u.email, u.role, u.job_title, u.emp_type, u.work_mode, u.created_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
    sha(token),
    Date.now()
  );
});

export const isManager = (u) => u.role === "owner" || u.role === "lead";

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}
export async function requireManager() {
  const u = await requireUser();
  if (!isManager(u)) redirect("/my-day");
  return u;
}
export async function requireOwner() {
  const u = await requireUser();
  if (u.role !== "owner") redirect("/");
  return u;
}
