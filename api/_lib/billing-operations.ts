import type {SupabaseClient} from '@supabase/supabase-js';
import {asaasRequest,AsaasError} from './asaas';
import {billingReference, type BillingRecord, type ProviderPayment, type ProviderSubscription} from './billing-validation';
export async function rpc(admin:SupabaseClient,name:string,args:Record<string,unknown>){const {data,error}=await admin.rpc(name,args);if(error)throw Error('BILLING_DATABASE_FAILED');return data;}
export async function patchLease(admin:SupabaseClient,id:string,token:string,patch:Record<string,unknown>){
 const {data,error}=await admin.from('subscriptions').update(patch).eq('id',id).eq('billing_lock_token',token).select('id').maybeSingle();
 if(error||!data)throw Error('BILLING_LEASE_LOST');
}
export async function releaseLease(admin:SupabaseClient,id:string,token:string){
 await admin.from('subscriptions').update({billing_lock_token:null,billing_lock_until:null}).eq('id',id).eq('billing_lock_token',token);
}
export async function providerSnapshot(record:BillingRecord):Promise<{subscription:ProviderSubscription;payments:ProviderPayment[]}>{
 let subscription:ProviderSubscription;
 try{subscription=await asaasRequest<ProviderSubscription>('/subscriptions/'+encodeURIComponent(record.asaas_subscription_id));}
 catch(error){if(!(error instanceof AsaasError)||error.status!==404)throw error;
 // A missing known provider subscription cannot grant more access; still reconcile all payments.
 subscription={id:record.asaas_subscription_id,customer:record.asaas_customer_id,value:Number(record.billing_amount),cycle:'MONTHLY',externalReference:billingReference(record.checkout_key),deleted:true,status:'INACTIVE'};
 }
 const payments:ProviderPayment[]=[];
 for(let offset=0;offset<1000;offset+=100){
  const page=await asaasRequest<{data:ProviderPayment[];hasMore:boolean}>('/subscriptions/'+encodeURIComponent(record.asaas_subscription_id)+'/payments?limit=100&offset='+offset);
  if(!Array.isArray(page.data))throw Error('INVALID_PROVIDER_RESPONSE');payments.push(...page.data);
  if(!page.hasMore)return {subscription,payments};
 }
 throw Error('PAYMENT_RECONCILIATION_LIMIT');
}
export function paymentUrl(value?:string){
 if(!value)return null;
 try{const u=new URL(value);if(u.protocol==='https:'&&u.hostname==='sandbox.asaas.com')return u.href;}catch{}
 throw Error('INVALID_PAYMENT_URL');
}
