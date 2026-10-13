import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clients, method, requireUser } from "../_lib/supabase";
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!method(req,res,["GET"])) return;
  const user = await requireUser(req,res); if (!user) return;
  try {
    const { admin } = clients();
    const { data, error } = await admin.from("subscriptions")
      .select("status,started_at,expires_at,plans(code,name,price_monthly,currency,features,limit_bank_accounts,limit_issuances)")
      .eq("user_id",user.id).in("status",["active","trialing","past_due","canceled"])
      .order("started_at",{ascending:false}).limit(1).maybeSingle();
    if (error) throw error;
    const valid = !!data && ["active","trialing"].includes(data.status) && (!data.expires_at || new Date(data.expires_at).getTime() > Date.now());
    res.status(200).json({ data: data || null, access_active: valid });
  } catch (error) {
    console.error("subscription_api_error",error);
    res.status(503).json({ error: { code: "SUBSCRIPTION_UNAVAILABLE", message: "Não foi possível consultar sua assinatura." } });
  }
}
