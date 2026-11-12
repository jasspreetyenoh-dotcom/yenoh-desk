import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cronAuth";
import { ensureRecurring } from "@/lib/recurring";

// Called once a day by Vercel (see vercel.json) so repeating tasks appear
// every morning even if nobody has opened Desk yet.
export async function GET(request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const created = await ensureRecurring();
  return NextResponse.json({ ok: true, created });
}
