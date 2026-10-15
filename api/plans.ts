import type { VercelRequest, VercelResponse } from "./_lib/http";
import { publicClient, method } from "./_lib/supabase";
import {publicPlan} from './_lib/entitlements';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  if (!method(req,res,["GET"])) return;
  try {
    const admin=publicClient();
    const { data, error } = await admin.from("plans").select("code,name,price_monthly,currency,limit_bank_accounts,limit_issuances,features").eq("is_active",true).order("price_monthly");
    if (error) throw error;
    res.status(200).json({ data: (data || []).map(publicPlan) });
  } catch (error) {
    console.error("plans_api_error", error);
    res.status(503).json({ error: { code: "PLANS_UNAVAILABLE", message: "Os planos estão temporariamente indisponíveis." } });
  }
}
