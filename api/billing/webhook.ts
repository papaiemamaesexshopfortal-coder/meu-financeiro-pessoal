import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { buffer } from "node:stream/consumers";
import { clients, method } from "../_lib/supabase";
export const config = { api: { bodyParser: false } };
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!method(req,res,["POST"])) return;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) { res.status(503).json({ error: { code: "WEBHOOK_NOT_CONFIGURED" } }); return; }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try {
    const raw = await buffer(req);
    event = stripe.webhooks.constructEvent(raw, req.headers["stripe-signature"] || "", secret);
  } catch (error) {
    res.status(400).json({ error: { code: "INVALID_WEBHOOK_SIGNATURE" } }); return;
  }
  try {
    const { admin } = clients();
    const { data: prior } = await admin.from("billing_events").select("provider_event_id").eq("provider_event_id",event.id).maybeSingle();
    if (prior) { res.status(200).json({ received: true, duplicate: true }); return; }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id, planId = session.metadata?.plan_id;
      if (userId && planId && session.subscription) {
        const stripeSubId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(stripeSubId);
        const status = sub.status === "active" || sub.status === "trialing" ? sub.status : sub.status === "past_due" ? "past_due" : "incomplete";
        const { error } = await admin.from("subscriptions").upsert({
          user_id: userId, plan_id: planId, status, stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripe_subscription_id: stripeSubId, stripe_checkout_session_id: session.id,
          started_at: new Date(sub.start_date*1000).toISOString(), expires_at: new Date(sub.current_period_end*1000).toISOString(),
          updated_at: new Date().toISOString()
        },{ onConflict: "stripe_subscription_id" });
        if (error) throw error;
      }
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status === "trialing" ? "trialing" : sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "incomplete";
      const { error } = await admin.from("subscriptions").update({ status, expires_at: new Date(sub.current_period_end*1000).toISOString(), canceled_at: sub.canceled_at ? new Date(sub.canceled_at*1000).toISOString() : null, updated_at: new Date().toISOString() }).eq("stripe_subscription_id",sub.id);
      if (error) throw error;
    }
    const { error: logged } = await admin.from("billing_events").insert({ provider_event_id: event.id, event_type: event.type });
    if (logged && logged.code !== "23505") throw logged;
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("stripe_webhook_processing_error",error);
    res.status(500).json({ error: { code: "WEBHOOK_PROCESSING_FAILED" } });
  }
}
