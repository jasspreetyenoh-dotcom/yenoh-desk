// Single place that talks to the database. Everything else calls all/get/run (or transaction).
//
// Online (Vercel):  set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN  -> a hosted Turso database.
// On your computer: set nothing                                  -> the local file data/desk.db.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, pass_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', job_title TEXT NOT NULL DEFAULT '',
  emp_type TEXT NOT NULL DEFAULT 'Full-time', work_mode TEXT NOT NULL DEFAULT 'Onsite',
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS services(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, checklist TEXT NOT NULL DEFAULT '[]', sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS clients(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS client_services(
  client_id INTEGER NOT NULL REFERENCES clients(id), service_id INTEGER NOT NULL REFERENCES services(id),
  PRIMARY KEY(client_id, service_id));
CREATE TABLE IF NOT EXISTS tasks(
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
  client_id INTEGER NOT NULL REFERENCES clients(id), service_id INTEGER NOT NULL REFERENCES services(id),
  assignee_id INTEGER NOT NULL REFERENCES users(id), created_by INTEGER NOT NULL REFERENCES users(id),
  due TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'todo', source TEXT NOT NULL DEFAULT 'WhatsApp',
  note TEXT NOT NULL DEFAULT '', proof TEXT NOT NULL DEFAULT '', checklist TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL, done_at TEXT);
CREATE TABLE IF NOT EXISTS attendance(
  user_id INTEGER NOT NULL REFERENCES users(id), date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'present',
  in_time TEXT NOT NULL DEFAULT '', out_time TEXT NOT NULL DEFAULT '', PRIMARY KEY(user_id, date));
CREATE TABLE IF NOT EXISTS recurring(
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
  client_id INTEGER NOT NULL REFERENCES clients(id), service_id INTEGER NOT NULL REFERENCES services(id),
  assignee_id INTEGER NOT NULL REFERENCES users(id), created_by INTEGER NOT NULL REFERENCES users(id),
  freq TEXT NOT NULL DEFAULT 'daily', weekday INTEGER NOT NULL DEFAULT 1, month_day INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1, last_run TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts(
  email TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, last INTEGER NOT NULL DEFAULT 0);
`;

// Yenoh's services, each with the checklist a team member must finish before submitting.
// Loaded once into an empty database. After that, edit them on the Services page.
const SERVICES = [
  ["Social Media – Content", ["Follow the brand tone guide", "Check spelling and hashtags", "Attach the post link"]],
  ["Social Media – PR Management", ["Reply to all new comments", "Reply to all DMs", "Send negative comments to the lead", "Attach screenshot proof"]],
  ["Video Production & Reels", ["Use brand fonts and logo", "Add captions", "Export in the correct size", "Upload to the client folder"]],
  ["Website Design & Development", ["Check on mobile", "Test all links and forms", "Share the preview link"]],
  ["Meta Ads", ["Check budget spend", "Pause poor ads", "Update the results sheet"]],
  ["Google Ads & SEO", ["Check budget spend", "Pause poor keywords", "Update the results sheet"]],
  ["Graphic Design", ["Use the brand colours and fonts", "Check sizes for each platform", "Upload source and final files"]],
  ["Brand Identity", ["Follow the client brief", "Prepare 2 options", "Share the presentation link"]],
  ["Web Apps & Software", ["Test the main flows", "Check on mobile", "Share the preview link"]],
];

function connect() {
  if (process.env.TURSO_DATABASE_URL) {
    return createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  if (process.env.VERCEL) {
    throw new Error("TURSO_DATABASE_URL is not set. Add it in the Vercel project settings.");
  }
  const dir = process.env.DESK_DATA_DIR || path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return createClient({ url: "file:" + path.join(dir, "desk.db").replace(/\\/g, "/") });
}

async function prepare(client) {
  // Fast path: one question tells us everything is already set up, which saves
  // several round trips to the database every time the app starts up.
  try {
    const { rows } = await client.execute(`SELECT
      (SELECT COUNT(*) FROM services) AS s,
      (SELECT COUNT(*) FROM pragma_table_info('tasks') WHERE name = 'recurring_id') AS r,
      (SELECT COUNT(*) FROM sqlite_master WHERE name = 'login_attempts') AS l,
      (SELECT COUNT(*) FROM sqlite_master WHERE name = 'recurring') AS c`);
    const x = rows[0];
    if (Number(x.s) > 0 && Number(x.r) === 1 && Number(x.l) === 1 && Number(x.c) === 1) return client;
  } catch {
    // tables do not exist yet: first run, set everything up below
  }
  await client.executeMultiple(SCHEMA);
  // Additive upgrade for databases made before repeating tasks existed.
  const cols = (await client.execute("PRAGMA table_info(tasks)")).rows.map((r) => r.name);
  if (!cols.includes("recurring_id")) await client.execute("ALTER TABLE tasks ADD COLUMN recurring_id INTEGER");
  const { rows } = await client.execute("SELECT COUNT(*) AS n FROM services");
  if (Number(rows[0].n) === 0) {
    await client.batch(
      SERVICES.map(([name, list], i) => ({
        sql: "INSERT INTO services(name, checklist, sort) VALUES(?,?,?)",
        args: [name, JSON.stringify(list), i],
      })),
      "write"
    );
  }
  return client;
}

// Connected and set up once per server, on first use (not at import, so building never touches the database).
const ready = () => (globalThis.__yenohDesk ??= prepare(connect()));

const plain = (rs) => rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));

export async function all(sql, ...args) {
  return plain(await (await ready()).execute({ sql, args }));
}
export async function get(sql, ...args) {
  return (await all(sql, ...args))[0] ?? null;
}
export async function run(sql, ...args) {
  const r = await (await ready()).execute({ sql, args });
  return { id: Number(r.lastInsertRowid ?? 0), changes: Number(r.rowsAffected) };
}

// All-or-nothing group of steps that other requests cannot interleave with.
//   await transaction(async (tx) => { await tx.run(...); const rows = await tx.all(...); });
export async function transaction(fn) {
  const tx = await (await ready()).transaction("write");
  const api = {
    all: async (sql, ...args) => plain(await tx.execute({ sql, args })),
    run: async (sql, ...args) => {
      const r = await tx.execute({ sql, args });
      return { id: Number(r.lastInsertRowid ?? 0), changes: Number(r.rowsAffected) };
    },
  };
  api.get = async (sql, ...args) => (await api.all(sql, ...args))[0] ?? null;
  try {
    const out = await fn(api);
    await tx.commit();
    return out;
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
}
