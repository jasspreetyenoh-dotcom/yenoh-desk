// Notifications: always saved for the in-app bell, and also emailed when email is set up.
//
// Email is optional. It switches on when RESEND_API_KEY and MAIL_FROM are set (see .env.example).
// Without them, Desk still works and the bell still fills up.
import { after } from "next/server";
import { all, get, run } from "./db";
import { today } from "./time";

const APP_URL = () => (process.env.APP_URL || "https://desk.yenoh.in").replace(/\/$/, "");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function sendEmail({ to, subject, text, link }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from || !to) return false;
  const url = link ? APP_URL() + link : APP_URL();
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1E1E1E">
    <h2 style="margin:0 0 12px;font-size:20px">${esc(subject)}</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;white-space:pre-line">${esc(text)}</p>
    <a href="${esc(url)}" style="display:inline-block;background:#F6C000;color:#1E1E1E;text-decoration:none;font-weight:bold;padding:10px 22px;border:2px solid #1E1E1E;border-radius:8px">Open Yenoh Desk</a>
    <p style="margin:24px 0 0;font-size:12px;color:#777">You can turn these emails off on the Account page in Desk.</p>
  </div>`;
  try {
    const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text: `${text}\n\n${url}`, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("Email not sent:", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error("Email not sent:", e.message);
    return false;
  }
}

// notify(userIds, { kind, title, body, link })
//   Saves one notification per person for the bell, then emails the ones who have email on.
//   Emails are sent after the page has responded, so nobody waits for them.
export async function notify(userIds, { kind, title, body = "", link = "" }) {
  const ids = [...new Set([].concat(userIds).filter(Boolean))];
  if (ids.length === 0) return;
  const day = today();
  for (const id of ids) {
    await run(
      "INSERT INTO notifications(user_id, kind, title, body, link, day, created_at) VALUES(?,?,?,?,?,?,?)",
      id, kind, title, body, link, day, Date.now()
    );
  }
  if (!process.env.RESEND_API_KEY) return;
  const people = await all(
    `SELECT email FROM users WHERE active = 1 AND email_notify = 1 AND id IN (${ids.map(() => "?").join(",")})`,
    ...ids
  );
  after(async () => {
    for (const p of people) await sendEmail({ to: p.email, subject: title, text: body || title, link });
  });
}

// Everyone who reviews work: the owner and the leads.
export async function managerIds(exceptUserId = 0) {
  const rows = await all("SELECT id FROM users WHERE active = 1 AND role IN ('owner','lead') AND id != ?", exceptUserId);
  return rows.map((r) => r.id);
}

export const unreadCount = async (userId) =>
  (await get("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0", userId)).n;
