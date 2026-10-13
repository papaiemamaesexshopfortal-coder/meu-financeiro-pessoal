import test from 'node:test';import assert from 'node:assert/strict';
import {validDocument,monthlyExpiry,reconcileAccess,billingReference,type BillingRecord,type ProviderSubscription,type ProviderPayment} from '../api/_lib/billing-validation';
import {providerSnapshot,paymentUrl} from '../api/_lib/billing-operations';
const record:BillingRecord={id:'local',user_id:'user',asaas_subscription_id:'sub_test',asaas_customer_id:'cus_test',billing_amount:39.9,checkout_key:'key',status:'incomplete',expires_at:null,canceled_at:null};
const sub:ProviderSubscription={id:'sub_test',customer:'cus_test',value:39.9,cycle:'MONTHLY',externalReference:billingReference('key'),status:'ACTIVE'};
const paid:ProviderPayment={id:'pay_test',subscription:'sub_test',customer:'cus_test',value:39.9,status:'RECEIVED',dueDate:'2026-10-13'};
const now=Date.parse('2026-10-13T15:00:00Z');
test('documents require valid check digits',()=>{assert.equal(validDocument('52998224725'),true);assert.equal(validDocument('11222333000181'),true);for(const doc of ['11111111111','52998224726','123','11222333000182'])assert.equal(validDocument(doc),false)});
test('calendar monthly access clamps short months at Fortaleza midnight',()=>{assert.equal(monthlyExpiry('2026-01-31'),'2026-02-28T03:00:00.000Z');assert.equal(monthlyExpiry('2028-01-31'),'2028-02-29T03:00:00.000Z');assert.equal(monthlyExpiry('2026-12-31'),'2027-01-31T03:00:00.000Z');assert.throws(()=>monthlyExpiry('2026-02-30'))});
test('pending payment never grants paid access',()=>{const state=reconcileAccess(record,sub,[{...paid,status:'PENDING'}],now);assert.equal(state.status,'incomplete');assert.equal(state.expires_at,null)});
test('settled payment grants exactly the paid monthly period',()=>{const state=reconcileAccess(record,sub,[paid],now);assert.equal(state.status,'active');assert.equal(state.expires_at,'2026-11-13T03:00:00.000Z');assert.equal(reconcileAccess(record,sub,[paid],Date.parse('2026-11-13T03:00:00Z')).status,'incomplete')});
test('wrong owner, amount, cycle or provider reference cannot grant access',()=>{
 for(const bad of [{customer:'other'},{value:249.9},{cycle:'YEARLY'},{externalReference:'other'}])assert.throws(()=>reconcileAccess(record,{...sub,...bad},[paid],now));
 assert.throws(()=>reconcileAccess(record,sub,[{...paid,customer:'other'}],now));assert.throws(()=>reconcileAccess(record,sub,[{...paid,value:1}],now));
});
test('refund and chargeback revoke access but overdue does not remove another paid current period',()=>{
 for(const status of ['REFUNDED','REFUND_REQUESTED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE'])assert.notEqual(reconcileAccess(record,sub,[{...paid,status}],now).status,'active');
 assert.notEqual(reconcileAccess(record,sub,[{...paid,refunds:[{}]}],now).status,'active');
 assert.equal(reconcileAccess(record,sub,[paid,{...paid,id:'next',status:'OVERDUE',dueDate:'2026-11-13'}],now).status,'active');
});
test('cancellation preserves already-paid access until expiration and then downgrades',()=>{const canceled={...sub,deleted:true,status:'INACTIVE'};assert.equal(reconcileAccess(record,canceled,[paid],now).status,'active');assert.equal(reconcileAccess(record,canceled,[paid],Date.parse('2026-11-14')).status,'canceled')});
test('invoice links only accept the Asaas HTTPS origin',()=>{assert.equal(paymentUrl('https://sandbox.asaas.com/i/test'),'https://sandbox.asaas.com/i/test');assert.equal(paymentUrl(undefined),null);for(const url of ['javascript:alert(1)','https://asaas.com.attacker.test/i/test','http://sandbox.asaas.com/i/test'])assert.throws(()=>paymentUrl(url))});
test('canonical reconciliation pages through payments and never trusts webhook state',async()=>{
 const oldFetch=globalThis.fetch,oldEnv={...process.env};const calls:string[]=[];
 try{process.env.ASAAS_ENVIRONMENT='sandbox';process.env.ASAAS_API_KEY='test';globalThis.fetch=async input=>{const path=String(input);calls.push(path);return new Response(JSON.stringify(path.endsWith('/subscriptions/sub_test')?sub:path.includes('offset=0')?{data:[{...paid,id:'old',status:'PENDING'}],hasMore:true}:{data:[paid],hasMore:false}),{status:200,headers:{'Content-Type':'application/json'}})};
 const snapshot=await providerSnapshot(record);assert.equal(snapshot.payments.length,2);assert.ok(calls[2].includes('offset=100'));assert.equal(reconcileAccess(record,snapshot.subscription,snapshot.payments,now).status,'active');
 }finally{globalThis.fetch=oldFetch;process.env=oldEnv}
});
