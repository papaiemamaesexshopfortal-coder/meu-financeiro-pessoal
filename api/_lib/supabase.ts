import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export function clients() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) throw new Error("Supabase environment is not configured");
  return {
    auth: createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }),
    admin: createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}
export async function requireUser(req: VercelRequest, res: VercelResponse) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) { res.status(401).json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Faça login para continuar." } }); return null; }
  try {
    const { auth } = clients();
    const { data, error } = await auth.auth.getUser(token);
    if (error || !data.user) { res.status(401).json({ error: { code: "INVALID_SESSION", message: "Sessão inválida ou expirada." } }); return null; }
    return data.user;
  } catch (error) {
    console.error("auth_configuration_error", error);
    res.status(503).json({ error: { code: "AUTH_UNAVAILABLE", message: "Autenticação temporariamente indisponível." } });
    return null;
  }
}
export function method(req: VercelRequest, res: VercelResponse, allowed: string[]) {
  if (!allowed.includes(req.method || "")) { res.setHeader("Allow", allowed.join(", ")); res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED" } }); return false; }
  return true;
}
