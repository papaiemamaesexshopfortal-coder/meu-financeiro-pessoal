import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clients, method, requireUser } from "./_lib/supabase";

const knownFeatures = new Set(["manual_transactions","basic_charts","bank_sync","ai_categorization","advanced_reports","invoice_issuance","boleto_pix","corporate_dre"]);
const recommended: Record<string,string> = {
  manual_transactions:"free", basic_charts:"free",
  bank_sync:"premium", ai_categorization:"premium", advanced_reports:"premium",
  invoice_issuance:"mei_pme_pro", boleto_pix:"mei_pme_pro", corporate_dre:"mei_pme_pro"
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!method(req,res,["POST"])) return;
  const user = await requireUser(req,res); if (!user) return;
  const feature = typeof req.body?.feature === "string" ? req.body.feature : "";
  if (!knownFeatures.has(feature)) {
    res.status(400).json({ error: { code: "UNKNOWN_FEATURE", message: "Recurso inválido." } }); return;
  }
  try {
    const { admin } = clients();
    const { data: sub, error } = await admin.from("subscriptions")
      .select("status,expires_at,plans(code,name,features,limit_bank_accounts,limit_issuances)")
      .eq("user_id",user.id).in("status",["active","trialing","past_due","canceled"])
      .order("started_at",{ascending:false}).limit(1).maybeSingle();
    if (error) throw error;
    const plan = sub?.plans as {code:string;name:string;features:Record<string,boolean>;limit_bank_accounts:number|null;limit_issuances:number|null}|null;
    const valid = !!sub && ["active","trialing"].includes(sub.status) && (!sub.expires_at || new Date(sub.expires_at).getTime()>Date.now());
    const allowed = valid && !!plan?.features?.[feature];
    if (!allowed) {
      res.status(403).json({
        error: { code: valid ? "FEATURE_LOCKED" : "SUBSCRIPTION_REQUIRED", feature, message: "Este recurso não está disponível no plano atual." },
        subscription: { current_plan: plan?.code || null, current_plan_name: plan?.name || null },
        upgrade: { recommended_plan: recommended[feature], checkout_required: recommended[feature] !== "free" }
      }); return;
    }
    res.status(200).json({ data: { allowed:true, feature, plan:plan?.code } });
  } catch (error) {
    console.error("feature_authorization_error",error);
    res.status(503).json({ error: { code: "AUTHORIZATION_UNAVAILABLE", message: "Não foi possível verificar as permissões." } });
  }
}
