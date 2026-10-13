import type { VercelRequest, VercelResponse } from "@vercel/node";
import { method } from "../_lib/supabase";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!method(req, res, ["GET"])) return;
  res.setHeader("Cache-Control", "no-store");
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return res.status(503).json({ error: { code: "AUTH_UNAVAILABLE", message: "Login temporariamente indisponível." } });
  }
  return res.status(200).json({ url, anonKey });
}
