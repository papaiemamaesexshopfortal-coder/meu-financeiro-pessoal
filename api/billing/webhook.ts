import type { VercelRequest, VercelResponse } from "../_lib/http";
import { clients, method } from "../_lib/supabase";
import { timingSafeEqual } from "node:crypto";
import { billingEnabled } from "../_lib/billing-safety";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!method(req, res, ["POST"])) return;
  res.setHeader("Cache-Control", "no-store");
  if (!billingEnabled()) return res.status(503).json({error:"BILLING_VALIDATION_REQUIRED"});
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  const supplied = req.headers["asaas-access-token"];
  const token = typeof supplied === "string" ? supplied : "";
  if (!expected) { res.status(503).json({ error: "WEBHOOK_NOT_CONFIGURED" }); return; }
  const a = Buffer.from(expected), b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a,b)) { res.status(401).json({ error: "UNAUTHORIZED" }); return; }
  const event = req.body;
  if (!event || typeof event.id !== "string" || typeof event.event !== "string") {
    res.status(400).json({ error: "INVALID_EVENT" }); return;
  }
  try {
    const { admin } = clients();
    const { data: previous, error: lookupError } = await admin.from("billing_events").select("provider_event_id").eq("provider_event_id", event.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (previous) { res.status(200).json({ received: true, duplicate: true }); return; }
    const subscriptionId = event.payment?.subscription || event.subscription?.id;
    if (typeof subscriptionId === "string") {
      const { data: sub, error: findError } = await admin.from("subscriptions").select("id,status").eq("asaas_subscription_id", subscriptionId).maybeSingle();
      if (findError) throw findError;
      if (!sub) return res.status(503).json({error:"SUBSCRIPTION_NOT_READY"});
      if (sub) {
        let status: string | undefined;
        if (["PAYMENT_RECEIVED","PAYMENT_CONFIRMED"].includes(event.event)) status = "active";
        if (["PAYMENT_OVERDUE","PAYMENT_REFUNDED","PAYMENT_CHARGEBACK_REQUESTED"].includes(event.event)) status = "past_due";
        if (["SUBSCRIPTION_DELETED","SUBSCRIPTION_INACTIVATED"].includes(event.event)) status = "canceled";
        if (status) {
          const { error } = await admin.from("subscriptions").update({
            status, updated_at: new Date().toISOString(),
            ...(status === "canceled" ? { canceled_at: new Date().toISOString() } : {})
          }).eq("id", sub.id);
          if (error) throw error;
        }
      }
    }
    const { error: logged } = await admin.from("billing_events").insert({ provider_event_id: event.id, event_type: event.event });
    if (logged && logged.code !== "23505") throw logged;
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("asaas_webhook_error", error);
    res.status(500).json({ error: "PROCESSING_FAILED" });
  }
}
