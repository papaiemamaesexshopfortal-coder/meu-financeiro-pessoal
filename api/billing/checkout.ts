import type {VercelRequest,VercelResponse} from '../_lib/http';
import {clients,method,requireUser} from '../_lib/supabase';
import {asaasRequest} from '../_lib/asaas';
import {billingEnabled,sandboxUserAllowed} from '../_lib/billing-safety';
import {validDocument,billingReference} from '../_lib/billing-validation';
import {patchLease,releaseLease,rpc,paymentUrl} from '../_lib/billing-operations';
import {createHash,randomUUID} from 'node:crypto';
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store');if(!method(req,res,['POST']))return;
 const user=await requireUser(req,res);if(!user)return;
 if(!billingEnabled()||!sandboxUserAllowed(user.id))return res.status(503).json({error:{code:'BILLING_VALIDATION_REQUIRED'}});
 const code=req.body?.plan_code,name=String(req.body?.name||'').trim(),doc=String(req.body?.cpf_cnpj||'').replace(/\D/g,''),billingType=req.body?.billing_type||'PIX';
 if(!['premium','mei_pme_pro'].includes(code)||!['PIX','BOLETO'].includes(billingType)||name.length<3||name.length>120||!validDocument(doc)||!user.email)return res.status(400).json({error:{code:'INVALID_CHECKOUT',message:'Informe nome, CPF/CNPJ e plano válidos.'}});
 if(!process.env.ASAAS_API_KEY)return res.status(503).json({error:{code:'BILLING_NOT_CONFIGURED'}});
 const token=randomUUID();let record:any;let admin;
 try{
  admin=clients().admin;
  const {data:plan,error}=await admin.from('plans').select('id,name,price_monthly').eq('code',code).eq('is_active',true).single();if(error||!plan)return res.status(404).json({error:{code:'PLAN_NOT_FOUND'}});
  const hash=createHash('sha256').update(JSON.stringify([user.id,name,doc,billingType,code])).digest('hex');
  const claim=await rpc(admin,'claim_checkout',{p_user:user.id,p_plan:plan.id,p_hash:hash,p_token:token});
  if(claim.error)return res.status(409).json({error:{code:claim.error,message:'Há uma assinatura ou operação pendente. Não inicie uma cobrança nova.'}});
  record=claim.subscription;const initialState=record.checkout_state;
  let customerId=record.asaas_customer_id;
  const customerRef='mfp:sandbox:user:'+user.id;
  if(!customerId){
   const {data:link,error:linkError}=await admin.from('billing_customer_links').select('provider_customer_id').eq('user_id',user.id).eq('environment','sandbox').maybeSingle();if(linkError)throw Error('CUSTOMER_LOOKUP_FAILED');
   customerId=link?.provider_customer_id;
   if(!customerId){
    const found=await asaasRequest<{data:Array<{id:string;externalReference:string}>}>('/customers?externalReference='+encodeURIComponent(customerRef)+'&limit=2');
    if(found.data.length>1)throw Error('DUPLICATE_PROVIDER_CUSTOMERS');
    customerId=found.data[0]?.id;
    if(!customerId){
     if(initialState!=='reserved')throw Error('PROVIDER_RESULT_UNKNOWN');
     await patchLease(admin,record.id,token,{checkout_state:'customer_creating'});
     const customer=await asaasRequest<{id:string}>('/customers',{method:'POST',body:{name,email:user.email,cpfCnpj:doc,externalReference:customerRef,notificationDisabled:true}});customerId=customer.id;
    }
    const {error:saved}=await admin.from('billing_customer_links').upsert({user_id:user.id,environment:'sandbox',provider_customer_id:customerId});if(saved)throw Error('CUSTOMER_SAVE_FAILED');
   }
   await patchLease(admin,record.id,token,{asaas_customer_id:customerId,checkout_state:'customer_ready'});
  }
  const customer=await asaasRequest<{id:string;externalReference:string}>('/customers/'+encodeURIComponent(customerId));
  if(customer.externalReference!==customerRef)throw Error('CUSTOMER_OWNER_MISMATCH');
  let subscriptionId=record.asaas_subscription_id;
  if(!subscriptionId){
   const found=await asaasRequest<{data:Array<{id:string;customer:string;externalReference:string}>}>('/subscriptions?externalReference='+encodeURIComponent(billingReference(record.checkout_key))+'&limit=2');
   if(found.data.length>1)throw Error('DUPLICATE_PROVIDER_SUBSCRIPTIONS');
   if(found.data[0]&&found.data[0].customer!==customerId)throw Error('SUBSCRIPTION_OWNER_MISMATCH');
   subscriptionId=found.data[0]?.id;
   if(!subscriptionId){
    if(['subscription_creating','needs_review'].includes(initialState))throw Error('PROVIDER_RESULT_UNKNOWN');
    await patchLease(admin,record.id,token,{checkout_state:'subscription_creating'});
    const sub=await asaasRequest<{id:string}>('/subscriptions',{method:'POST',body:{customer:customerId,billingType,value:Number(record.billing_amount),nextDueDate:record.checkout_due_date,cycle:'MONTHLY',description:'Meu Financeiro Pessoal - '+plan.name,externalReference:billingReference(record.checkout_key)}});subscriptionId=sub.id;
   }
   await patchLease(admin,record.id,token,{asaas_subscription_id:subscriptionId,asaas_customer_id:customerId,checkout_state:'completed'});
  }
  const charges=await asaasRequest<{data:Array<{invoiceUrl?:string}>}>('/subscriptions/'+encodeURIComponent(subscriptionId)+'/payments?limit=10');
  return res.status(200).json({data:{subscription_id:record.id,payment_url:paymentUrl(charges.data[0]?.invoiceUrl),status:'pending_payment',environment:'sandbox'}});
 }catch{
  // A timeout can mean the provider accepted the request. Preserve reservation and reconcile on retry.
  return res.status(502).json({error:{code:'CHECKOUT_RECONCILIATION_REQUIRED',message:'Operação preservada para conferência. Tente retomar; não crie outra assinatura.'}});
 }finally{if(admin&&record)await releaseLease(admin,record.id,token);}
}
