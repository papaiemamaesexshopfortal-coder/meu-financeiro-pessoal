import type {VercelRequest,VercelResponse} from '../_lib/http';
import {clients,method,requireUser} from '../_lib/supabase';
import {billingEnabled,sandboxUserAllowed} from '../_lib/billing-safety';
import {asaasRequest,AsaasError} from '../_lib/asaas';
import {billingReference,type BillingRecord,type ProviderSubscription} from '../_lib/billing-validation';
import {rpc,releaseLease} from '../_lib/billing-operations';
import {randomUUID} from 'node:crypto';
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store');if(!method(req,res,['POST']))return;
 const user=await requireUser(req,res);if(!user)return;
 if(!billingEnabled()||!sandboxUserAllowed(user.id))return res.status(503).json({error:{code:'BILLING_VALIDATION_REQUIRED'}});
 const id=req.body?.subscription_id;if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({error:{code:'INVALID_SUBSCRIPTION'}});
 const token=randomUUID();let admin;let record:BillingRecord|undefined;
 try{
  admin=clients().admin;const claim=await rpc(admin,'claim_billing_cancellation',{p_user:user.id,p_subscription:id,p_token:token});
  if(claim.error)return res.status(claim.error==='SUBSCRIPTION_NOT_FOUND'?404:409).json({error:{code:claim.error}});
  record=claim.subscription;if(!record?.asaas_subscription_id)return res.status(409).json({error:{code:'CHECKOUT_PENDING'}});
  try{
   const sub=await asaasRequest<ProviderSubscription>('/subscriptions/'+encodeURIComponent(record.asaas_subscription_id));
   if(sub.customer!==record.asaas_customer_id||sub.externalReference!==billingReference(record.checkout_key))throw Error('SUBSCRIPTION_OWNER_MISMATCH');
   if(!sub.deleted)await asaasRequest('/subscriptions/'+encodeURIComponent(record.asaas_subscription_id),{method:'DELETE'});
  }catch(error){if(!(error instanceof AsaasError)||error.status!==404)throw error;}
  const data=await rpc(admin,'finish_billing_cancellation',{p_subscription:record.id,p_token:token});
  return res.status(200).json({data,environment:'sandbox'});
 }catch{return res.status(503).json({error:{code:'CANCELLATION_RECONCILIATION_REQUIRED'}});}
 finally{if(admin&&record)await releaseLease(admin,record.id,token);}
}
