import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { ensureRecurring } from "@/lib/recurring";

// Called once a day by Vercel (see vercel.json) so repeating tasks appear
// every morning even if nobody has opened Desk yet.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const sent = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok =
    secret &&
    sent.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const created = await ensureRecurring();
  return NextResponse.json({ ok: true, created });
}
