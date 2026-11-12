// The Yenoh "Y" that draws itself, same mark as the intro on yenoh.in.
// Plain CSS animation, so it works while the page is still loading.
export default function LoaderMark({ full = false, label = "Loading" }) {
  return (
    <div className={full ? "loader loader-full" : "loader"} role="status" aria-live="polite">
      <svg className="loader-y" viewBox="0 0 100 100" aria-hidden="true">
        <path className="ly" pathLength="1" d="M20 22 C24 30, 40 55, 46 66 C50 73, 51 80, 50 86" />
        <path className="la" pathLength="1" d="M46 66 C58 50, 68 34, 76 20" />
        <path className="lh" d="M70 18 L78 19 L76 30" />
      </svg>
      {full && <img src="/yenoh-logo.png" alt="" className="loader-logo" />}
      <span className="sr">{label}</span>
    </div>
  );
}
