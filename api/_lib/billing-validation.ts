export function validDocument(value:string) {
 if(!/^\d{11}$|^\d{14}$/.test(value)||/^(\d)\1+$/.test(value))return false;
 const digit=(base:string,weights:number[])=>{const rem=base.split('').reduce((n,v,i)=>n+Number(v)*weights[i],0)%11;return rem<2?0:11-rem};
 if(value.length===11){const base=value.slice(0,9);const first=digit(base,[10,9,8,7,6,5,4,3,2]);return value===base+first+digit(base+first,[11,10,9,8,7,6,5,4,3,2]);}
 const base=value.slice(0,12),first=digit(base,[5,4,3,2,9,8,7,6,5,4,3,2]);return value===base+first+digit(base+first,[6,5,4,3,2,9,8,7,6,5,4,3,2]);
}
export function cents(value:number){if(!Number.isFinite(value)||value<=0)throw Error('INVALID_AMOUNT');return Math.round(value*100);}
export function billingReference(key:string){return 'mfp:sandbox:'+key;}
export function monthlyExpiry(date:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('INVALID_DUE_DATE');
 const [y,m,d]=date.split('-').map(Number),source=new Date(Date.UTC(y,m-1,d));
 if(source.toISOString().slice(0,10)!==date)throw Error('INVALID_DUE_DATE');
 const end=new Date(Date.UTC(y,m,1));end.setUTCDate(Math.min(d,new Date(Date.UTC(y,m+1,0)).getUTCDate()));
 return end.toISOString().slice(0,10)+'T03:00:00.000Z';
}
export type ProviderSubscription={id:string;customer:string;value:number;cycle:string;externalReference?:string;deleted?:boolean;status:string};
export type ProviderPayment={id:string;subscription:string;customer:string;value:number;status:string;dueDate:string;deleted?:boolean;refunds?:unknown[];invoiceUrl?:string};
export type BillingRecord={id:string;user_id:string;asaas_subscription_id:string;asaas_customer_id:string;billing_amount:number;checkout_key:string;status:string;expires_at:string|null;canceled_at:string|null};
export function reconcileAccess(record:BillingRecord,subscription:ProviderSubscription,payments:ProviderPayment[],now=Date.now()){
 if(subscription.id!==record.asaas_subscription_id||subscription.customer!==record.asaas_customer_id||subscription.externalReference!==billingReference(record.checkout_key)||subscription.cycle!=='MONTHLY'||cents(subscription.value)!==cents(Number(record.billing_amount)))throw Error('SUBSCRIPTION_MISMATCH');
 let expires:string|null=null,overdue=false;
 for(const p of payments){
  if(p.subscription!==subscription.id||p.customer!==subscription.customer)throw Error('PAYMENT_OWNER_MISMATCH');
  if(p.status==='OVERDUE')overdue=true;
  if(!['RECEIVED','CONFIRMED','RECEIVED_IN_CASH'].includes(p.status)||p.deleted||p.refunds?.length)continue;
  if(cents(p.value)!==cents(Number(record.billing_amount)))throw Error('PAYMENT_AMOUNT_MISMATCH');
  const end=monthlyExpiry(p.dueDate);if(!expires||end>expires)expires=end;
 }
 const canceled=!!subscription.deleted||['INACTIVE','EXPIRED'].includes(subscription.status)||!!record.canceled_at;
 const active=!!expires&&new Date(expires).getTime()>now;
 return {status:active?'active':canceled?'canceled':overdue?'past_due':'incomplete',expires_at:expires,canceled};
}
