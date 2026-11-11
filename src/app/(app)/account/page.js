import { requireUser } from "@/lib/auth";
import { changePassword } from "@/app/actions";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Account · Yenoh Desk" };

const ERRORS = {
  current: "Your current password is not right.",
  short: "The new password must be at least 8 characters.",
};

export default async function AccountPage({ searchParams }) {
  const user = await requireUser();
  const { error, ok } = await searchParams;

  return (
    <>
      <PageHead title="My" mark="account" sub={`${user.name} · ${user.email}`} />
      <div className="card" style={{ maxWidth: 480 }}>
        <h2>Change password</h2>
        {ok && <div className="msg ok">Password changed.</div>}
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
    </>
  );
}
