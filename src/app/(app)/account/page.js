import { get } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { changePassword, setEmailNotify } from "@/app/actions";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Account · Yenoh Desk" };

const ERRORS = {
  current: "Your current password is not right.",
  short: "The new password must be at least 8 characters.",
};

export default async function AccountPage({ searchParams }) {
  const user = await requireUser();
  const { error, ok } = await searchParams;
  const { email_notify } = await get("SELECT email_notify FROM users WHERE id = ?", user.id);

  return (
    <>
      <PageHead title="My" mark="account" sub={`${user.name} · ${user.email}`} />
      <div className="stack" style={{ maxWidth: 480 }}>
        <div className="card">
          <h2>Email notifications</h2>
          {ok === "email" && <div className="msg ok">Saved.</div>}
          <form action={setEmailNotify}>
            <div className="checks" style={{ gridTemplateColumns: "1fr" }}>
              <label>
                <input type="checkbox" name="email_notify" defaultChecked={!!email_notify} />
                Email me about new tasks, work sent back, reviews and reminders
              </label>
            </div>
            <p className="muted" style={{ marginBottom: 12 }}>Sent to {user.email}. The bell in Desk always works.</p>
            <button className="btn-sm">Save</button>
          </form>
        </div>

        <div className="card">
          <h2>Change password</h2>
          {ok === "1" && <div className="msg ok">Password changed.</div>}
          {ERRORS[error] && <div className="msg err">{ERRORS[error]}</div>}
          <form action={changePassword}>
            <div className="fld">
              <label htmlFor="current">Current password</label>
              <input id="current" name="current" type="password" required autoComplete="current-password" />
            </div>
            <div className="fld">
              <label htmlFor="next">New password (8+ characters)</label>
              <input id="next" name="next" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            <button className="btn-sm">Change password</button>
          </form>
        </div>
      </div>
    </>
  );
}
