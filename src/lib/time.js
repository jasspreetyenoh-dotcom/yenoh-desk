// All dates and times are in India time, whatever the server's clock says.
const TZ = "Asia/Kolkata";
const toUTC = (s) => new Date(s + "T00:00:00Z");

export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
export const nowTime = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
export const addDays = (s, n) => {
  const d = toUTC(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const diffDays = (a, b) => Math.round((toUTC(a) - toUTC(b)) / 864e5);
export const weekday = (s) => toUTC(s).getUTCDay();
export const fmtDate = (s, opts = { day: "numeric", month: "short" }) =>
  toUTC(s).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(toUTC(s));
