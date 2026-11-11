import { redirect } from "next/navigation";
import { connection } from "next/server";
import { get } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { login } from "@/app/actions";

export const metadata = { title: "Log in · Yenoh Desk" };

const ERRORS = {
  wrong: "That email or password is not right.",
  wait: "Too many wrong tries. Wait 5 minutes and try again.",
};

export default async function LoginPage({ searchParams }) {
  await connection(); // always check the live database, never a page saved at build time
  const { n } = await get("SELECT COUNT(*) n FROM users");
  if (n === 0) redirect("/setup");
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="center">
      <div className="auth">
        <div className="brand">
          <img src="/logo.png" alt="" />
          <span>Yenoh <span className="mark">Desk</span></span>
        </div>
        <div className="card">
          <h2>Log in</h2>
          {ERRORS[error] && <div className="msg err">{ERRORS[error]}</div>}
          <form action={login}>
            <div className="fld">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="username" />
            </div>
            <div className="fld">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            <button className="btn">Log in</button>
          </form>
        </div>
        <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>
          Forgot your password? Ask the owner to reset it.
        </p>
      </div>
    </div>
  );
}
