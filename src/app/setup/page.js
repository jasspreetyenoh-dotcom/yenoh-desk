import { redirect } from "next/navigation";
import { connection } from "next/server";
import { get } from "@/lib/db";
import { setupOwner } from "@/app/actions";

export const metadata = { title: "Set up · Yenoh Desk" };

const ERRORS = {
  details: "Enter your name and a valid email.",
  password: "The password must be at least 8 characters.",
};

// Shown only once, when the desk has no accounts yet.
export default async function SetupPage({ searchParams }) {
  await connection(); // always check the live database, never a page saved at build time
  const { n } = await get("SELECT COUNT(*) n FROM users");
  if (n > 0) redirect("/login");
  const { error } = await searchParams;

  return (
    <div className="center">
      <div className="auth">
        <div className="brand">
          <img src="/yenoh-logo.png" alt="Yenoh" />
          <span className="mark">Desk</span>
        </div>
        <div className="card">
          <h2>Create the owner account</h2>
          <p className="sub" style={{ marginTop: 0 }}>
            This is the first account. It can add the team and see everything.
          </p>
          {ERRORS[error] && <div className="msg err">{ERRORS[error]}</div>}
          <form action={setupOwner}>
            <div className="fld">
              <label htmlFor="name">Your name</label>
              <input id="name" name="name" type="text" required maxLength={80} autoComplete="name" />
            </div>
            <div className="fld">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="username" />
            </div>
            <div className="fld">
              <label htmlFor="password">Password (8 characters or more)</label>
              <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            <button className="btn">Create account</button>
          </form>
        </div>
      </div>
    </div>
  );
}
