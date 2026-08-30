import { redirect } from "next/navigation";
import { getSession, homeForRole } from "@/lib/auth";

// Sign-in is split per role now (/, /screener, /admin, /super_admin). This path is kept so
// existing links and bookmarks still land somewhere sensible rather than 404ing: a live
// session goes to its own home, everyone else to the applicant door, which links onward to
// the staff ones.
export default async function LegacyLoginPage() {
  const session = await getSession();
  redirect(session ? homeForRole(session.role) : "/");
}
