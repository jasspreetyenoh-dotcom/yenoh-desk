import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/notify";

// Used by the bell to show how many unread notifications the logged-in person has.
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ count: 0 }, { status: 401 });
  return NextResponse.json({ count: await unreadCount(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
