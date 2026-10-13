import type { VercelRequest, VercelResponse } from "../_lib/http";
import { clients, method, requireUser } from "../_lib/supabase";
import { asaasRequest } from "../_lib/asaas";
import { billingEnabled, sandboxUserAllowed } from "../_lib/billing-safety";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!method(req,res,["POST"])) return;
  const user = await requireUser(req,res); if (!user) return;
  res.setHeader("Cache-Control", "no-store");
  if (!billingEnabled() || !sandboxUserAllowed(user.id)) {
    return res.status(503).json({error:{code:"BILLING_VALIDATION_REQUIRED",message:"Assinaturas em validação. Cobranças indisponíveis."}});
  }
  const code = req.body?.plan_code;
  const name = String(req.body?.name || "").trim();
  const cpfCnpj = String(req.body?.cpf_cnpj || "").replace(/[^0-9]/g, "");
  const billingType = req.body?.billing_type || "UNDEFINED";
  if (!["premium","mei_pme_pro"].includes(code) || !["UNDEFINED","PIX","BOLETO"].includes(billingType) || name.length < 3 || ![11,14].includes(cpfCnpj.length) || !user.email) {
    res.status(400).json({ error: { code: "INVALID_CHECKOUT", message: "Informe plano, nome e CPF/CNPJ válidos." } }); return;
  }
  if (!process.env.ASAAS_API_KEY) { res.status(503).json({ error: { code: "BILLING_NOT_CONFIGURED" } }); return; }
  try {
    const { admin } = clients();
    const { data: plan, error } = await admin.from("plans").select("id,name,price_monthly").eq("code",code).eq("is_active",true).single();
    if (error || !plan) { res.status(404).json({ error: { code: "PLAN_NOT_FOUND" } }); return; }
    const { data: existing } = await admin.from("subscriptions").select("id").eq("user_id",user.id).in("status",["active","trialing","incomplete"]).limit(1);
    if (existing?.length) { res.status(409).json({ error: { code: "SUBSCRIPTION_EXISTS" } }); return; }
    const { data: mapping } = await admin.from("asaas_customers").select("asaas_customer_id").eq("user_id",user.id).maybeSingle();
    let customerId = mapping?.asaas_customer_id;
    if (!customerId) {
      const customer = await asaasRequest<{id:string}>("/customers",{method:"POST",body:{name,email:user.email,cpfCnpj,externalReference:user.id}});
      customerId = customer.id;
      const { error: saved } = await admin.from("asaas_customers").upsert({user_id:user.id,asaas_customer_id:customerId});
      if (saved) throw saved;
    }
    const sub = await asaasRequest<{id:string}>("/subscriptions",{method:"POST",body:{
      customer:customerId,billingType,value:Number(plan.price_monthly),nextDueDate:new Date().toISOString().slice(0,10),
      cycle:"MONTHLY",description:"Meu Financeiro Pessoal - "+plan.name,externalReference:user.id
    }});
    const { error: inserted } = await admin.from("subscriptions").insert({
      user_id:user.id,plan_id:plan.id,status:"incomplete",asaas_customer_id:customerId,asaas_subscription_id:sub.id
    });
    if (inserted) throw inserted;
    const charges = await asaasRequest<{data:Array<{id:string,invoiceUrl?:string}>}>("/subscriptions/"+encodeURIComponent(sub.id)+"/payments?limit=10");
    res.status(200).json({data:{subscription_id:sub.id,payment_url:charges.data?.[0]?.invoiceUrl || null,status:"pending_payment"}});
  } catch (error) {
    console.error("asaas_checkout_error",error);
    res.status(502).json({error:{code:"CHECKOUT_FAILED",message:"Não foi possível iniciar a assinatura. Contate o suporte antes de tentar novamente."}});
  }
}
