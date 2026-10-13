import type {VercelRequest,VercelResponse} from '../_lib/http';
import {clients,method} from '../_lib/supabase';
import {timingSafeEqual,randomUUID} from 'node:crypto';
import {billingEnabled,sandboxUserAllowed} from '../_lib/billing-safety';
import {reconcileAccess,type BillingRecord} from '../_lib/billing-validation';
import {rpc,releaseLease,providerSnapshot} from '../_lib/billing-operations';
const events=new Set(['PAYMENT_CREATED','PAYMENT_UPDATED','PAYMENT_RECEIVED','PAYMENT_CONFIRMED','PAYMENT_OVERDUE','PAYMENT_REFUNDED','PAYMENT_PARTIALLY_REFUNDED','PAYMENT_REFUND_IN_PROGRESS','PAYMENT_DELETED','PAYMENT_RESTORED','PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE','PAYMENT_AWAITING_CHARGEBACK_REVERSAL','SUBSCRIPTION_CREATED','SUBSCRIPTION_UPDATED','SUBSCRIPTION_DELETED','SUBSCRIPTION_INACTIVATED']);
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store');if(!method(req,res,['POST']))return;
 if(!billingEnabled())return res.status(503).json({error:'BILLING_VALIDATION_REQUIRED'});
 const expected=process.env.ASAAS_WEBHOOK_TOKEN,supplied=req.headers['asaas-access-token'];
 if(!expected)return res.status(503).json({error:'WEBHOOK_NOT_CONFIGURED'});
 const a=Buffer.from(expected),b=Buffer.from(typeof supplied==='string'?supplied:'');
 if(a.length!==b.length||!timingSafeEqual(a,b))return res.status(401).json({error:'UNAUTHORIZED'});
 const event=req.body;
 if(!event||typeof event.id!=='string'||!event.id.length||event.id.length>200||typeof event.event!=='string')return res.status(400).json({error:'INVALID_EVENT'});
 if(!events.has(event.event))return res.status(200).json({received:true,ignored:true});
 const providerId=event.payment?.subscription||event.subscription?.id;
 if(typeof providerId!=='string'||!/^sub_[A-Za-z0-9_]+$/.test(providerId))return res.status(400).json({error:'INVALID_SUBSCRIPTION'});
 const token=randomUUID();let admin;let record:BillingRecord|undefined;
 try{
  admin=clients().admin;
  const claim=await rpc(admin,'claim_billing_event',{p_event:event.id,p_type:event.event,p_subscription:providerId,p_token:token});
  if(claim.duplicate)return res.status(200).json({received:true,duplicate:true});
  if(claim.error)return res.status(503).json({error:claim.error});
  record=claim.subscription;
  if(!record||!sandboxUserAllowed(record.user_id))return res.status(503).json({error:'SANDBOX_USER_NOT_ALLOWED'});
  // Fetch only after acquiring the per-subscription lease: late events reconcile current state.
  const snapshot=await providerSnapshot(record),access=reconcileAccess(record,snapshot.subscription,snapshot.payments);
  await rpc(admin,'finish_billing_event',{p_event:event.id,p_subscription:record.id,p_token:token,p_status:access.status,p_expires:access.expires_at,p_canceled:access.canceled});
  return res.status(200).json({received:true});
 }catch{return res.status(503).json({error:'RECONCILIATION_FAILED'});}
 finally{if(admin&&record)await releaseLease(admin,record.id,token);}
}
