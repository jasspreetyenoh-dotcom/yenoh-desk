import crypto from "node:crypto";

// The scheduled jobs are web addresses, so they must refuse anyone without the secret.
// Vercel sends "Authorization: Bearer <CRON_SECRET>" with each scheduled call.
export function isCronRequest(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const sent = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return sent.length === expected.length && crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
}
