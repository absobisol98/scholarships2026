import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();
  if (session?.role === "student") redirect("/browse");
  if (session?.role === "admin") redirect("/admin");
  redirect("/login");
}
