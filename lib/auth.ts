import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: data.claims.sub, email };
}

export function unauthorized() {
  return Response.json({ error: "Entre na sua conta para continuar." }, { status: 401, headers: { "cache-control": "no-store" } });
}
