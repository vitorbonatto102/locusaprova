import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import LoginForm from "./login-form";

export default async function LoginPage() {
  if (await getAuthenticatedUser()) redirect("/estudar");
  return <LoginForm />;
}
