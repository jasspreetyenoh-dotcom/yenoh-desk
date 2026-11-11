import { redirect } from "next/navigation";
import { connection } from "next/server";
import { get } from "@/lib/db";
import { currentUser, isManager } from "@/lib/auth";

export default async function Home() {
  await connection(); // always check the live database, never a page saved at build time
  const { n } = await get("SELECT COUNT(*) n FROM users");
  if (n === 0) redirect("/setup");
  const user = await currentUser();
  if (!user) redirect("/login");
  redirect(isManager(user) ? "/dashboard" : "/my-day");
}
