import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { clients, method, requireUser } from "../_lib/supabase";
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!method(req,res,["POST"])) return;
  const user = await requireUser(req,res); if (!user) return;
  const code = typeof req.body?.plan_code === "string" ? req.body.plan_code : "";
  if (!["premium","mei_pme_pro"].includes(code)) { res.status(400).json({ error: { code: "INVALID_PLAN", message: "Selecione um plano pago válido." } }); return; }
  const appUrl = process.env.APP_URL;
  if (!appUrl || !process.env.STRIPE_SECRET_KEY) { res.status(503).json({ error: { code: "BILLING_NOT_CONFIGURED", message: "O serviço de cobrança ainda não foi configurado." } }); return; }
  try {
    const { admin } = clients();
    const { data: plan, error } = await admin.from("plans").select("id,code,name,price_monthly,currency").eq("code",code).eq("is_active",true).single();
    if (error || !plan) { res.status(404).json({ error: { code: "PLAN_NOT_FOUND" } }); return; }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email || undefined,
      line_items: [{ price_data: { currency: String(plan.currency || "BRL").toLowerCase(), unit_amount: Math.round(Number(plan.price_monthly)*100), recurring: { interval: "month" }, product_data: { name: plan.name, description: "Assinatura Meu Financeiro Pessoal" } }, quantity: 1 }],
      metadata: { user_id: user.id, plan_id: plan.id, plan_code: plan.code },
      subscription_data: { metadata: { user_id: user.id, plan_id: plan.id, plan_code: plan.code } },
      success_url: appUrl.replace(/\/$/,"") + "/?billing=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: appUrl.replace(/\/$/,"") + "/?billing=cancelled",
    });
    res.status(200).json({ data: { checkout_url: session.url } });
  } catch (error) {
    console.error("checkout_api_error",error);
    res.status(502).json({ error: { code: "CHECKOUT_FAILED", message: "Não foi possível iniciar a cobrança. Tente novamente." } });
  }
}
