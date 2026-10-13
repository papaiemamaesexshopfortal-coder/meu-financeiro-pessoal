import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clients, method } from "./_lib/supabase";
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  if (!method(req,res,["GET"])) return;
  try {
    const { admin } = clients();
    const { data, error } = await admin.from("plans").select("code,name,price_monthly,currency,limit_bank_accounts,limit_issuances,features").eq("is_active",true).order("price_monthly");
    if (error) throw error;
    res.status(200).json({ data: data || [] });
  } catch (error) {
    console.error("plans_api_error", error);
    res.status(503).json({ error: { code: "PLANS_UNAVAILABLE", message: "Os planos estão temporariamente indisponíveis." } });
  }
}
