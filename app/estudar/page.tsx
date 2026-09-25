import LocusApp from "../locus-app";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function StudyPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  return <LocusApp accountName={user.email?.split("@")[0] ?? "Estudante"} />;
}
