import test from 'node:test';import assert from 'node:assert/strict';
import checkout from '../api/billing/checkout';import webhook from '../api/billing/webhook';
import type {VercelRequest,VercelResponse} from '../api/_lib/http';
const user='00000000-0000-4000-8000-000000000001';
const localId='00000000-0000-4000-8000-000000000003';
function response(){const out:{status:number;body:any}={status:200,body:null};const res:VercelResponse={setHeader:()=>{},status:n=>{out.status=n;return res},json:b=>{out.body=b;return res},end:()=>{}};return {out,res};}
function fixture(timeoutAt:'customer'|'subscription'|null){
 let customer:any=null,providerSub:any=null,link:any=null;let customerPosts=0,subscriptionPosts=0,timedOut=false;
 let state:any={id:localId,user_id:user,status:'incomplete',checkout_state:'reserved',checkout_key:localId,billing_amount:39.9,checkout_due_date:'2026-10-13',asaas_customer_id:null,asaas_subscription_id:null};
 const fetcher:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));const method=init?.method||'GET';const body=init?.body?JSON.parse(String(init.body)):{};
  const result=(value:any)=>new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
  if(url.pathname==='/auth/v1/user')return result({id:user,email:'billing-test@example.invalid'});
  if(url.pathname==='/rest/v1/plans')return result({id:'plan',name:'Premium',price_monthly:39.9});
  if(url.pathname==='/rest/v1/rpc/claim_checkout'){state.billing_lock_token=body.p_token;return result({subscription:{...state}})}
  if(url.pathname==='/rest/v1/subscriptions'&&method==='PATCH'){Object.assign(state,body);return result({id:state.id})}
  if(url.pathname==='/rest/v1/billing_customer_links'){
   if(method==='GET')return result(link?[link]:[]);link=body;return result(null);
  }
  if(url.hostname==='api-sandbox.asaas.com'){
   if(url.pathname==='/v3/customers'&&method==='GET')return result({data:customer?[customer]:[]});
   if(url.pathname==='/v3/customers'&&method==='POST'){
    customerPosts++;customer={id:'cus_test',externalReference:body.externalReference};
    if(timeoutAt==='customer'&&!timedOut){timedOut=true;throw Error('Simulated lost response after provider commit')}
    return result(customer);
   }
   if(url.pathname==='/v3/customers/cus_test')return result(customer);
   if(url.pathname==='/v3/subscriptions'&&method==='GET')return result({data:providerSub?[providerSub]:[]});
   if(url.pathname==='/v3/subscriptions'&&method==='POST'){
    subscriptionPosts++;providerSub={id:'sub_test',customer:'cus_test',externalReference:body.externalReference};
    if(timeoutAt==='subscription'&&!timedOut){timedOut=true;throw Error('Simulated lost subscription response')}
    return result(providerSub);
   }
   if(url.pathname==='/v3/subscriptions/sub_test/payments')return result({data:[{invoiceUrl:'https://sandbox.asaas.com/i/test'}]});
  }
  throw Error('Unexpected request: '+method+' '+url.pathname);
 };
 return {fetcher,get counts(){return {customerPosts,subscriptionPosts}},get state(){return state}};
}
async function environment(fn:()=>Promise<void>){const oldEnv={...process.env},oldFetch=globalThis.fetch;try{
 process.env.SUPABASE_URL='https://supabase.test';process.env.SUPABASE_ANON_KEY='test-public';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service';process.env.ASAAS_ENVIRONMENT='sandbox';process.env.ASAAS_API_KEY='test-provider';process.env.BILLING_SANDBOX_ENABLED='true';process.env.BILLING_TEST_USER_IDS=user;process.env.ASAAS_WEBHOOK_TOKEN='test-hook';await fn();
 }finally{process.env=oldEnv;globalThis.fetch=oldFetch}}
const request:VercelRequest={method:'POST',headers:{authorization:'Bearer test-user-token'},body:{plan_code:'premium',name:'Pessoa Teste',cpf_cnpj:'52998224725',billing_type:'PIX'}};
for(const timeoutAt of ['customer','subscription'] as const)test('lost '+timeoutAt+' response is reconciled without a duplicate POST',async()=>environment(async()=>{
 const f=fixture(timeoutAt);globalThis.fetch=f.fetcher;
 const first=response();await checkout(request,first.res);assert.equal(first.out.status,502);
 const retry=response();await checkout(request,retry.res);assert.equal(retry.out.status,200,JSON.stringify(retry.out.body));
 const again=response();await checkout(request,again.res);assert.equal(again.out.status,200);
 assert.deepEqual(f.counts,{customerPosts:1,subscriptionPosts:1});assert.equal(f.state.status,'incomplete');assert.equal(retry.out.body.data.environment,'sandbox');
}));
test('invalid document never reserves a checkout or contacts the payment provider',async()=>environment(async()=>{
 let nonAuthCalls=0;globalThis.fetch=async input=>{if(new URL(String(input)).pathname!=='/auth/v1/user')nonAuthCalls++;return new Response(JSON.stringify({id:user,email:'test@example.invalid'}),{status:200})};
 const out=response();await checkout({...request,body:{...request.body,cpf_cnpj:'11111111111'}},out.res);assert.equal(out.out.status,400);assert.equal(nonAuthCalls,0);
}));
test('unauthenticated webhook is rejected before any database or provider request',async()=>environment(async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Should not fetch')};const out=response();await webhook({method:'POST',headers:{},body:{id:'evt',event:'PAYMENT_RECEIVED',payment:{subscription:'sub_test'}}},out.res);assert.equal(out.out.status,401);assert.equal(calls,0);
}));
test('already committed webhook is acknowledged without reapplying access',async()=>environment(async()=>{
 const paths:string[]=[];globalThis.fetch=async input=>{paths.push(new URL(String(input)).pathname);return new Response(JSON.stringify({duplicate:true}),{status:200,headers:{'Content-Type':'application/json'}})};
 const out=response();await webhook({method:'POST',headers:{'asaas-access-token':'test-hook'},body:{id:'evt',event:'PAYMENT_RECEIVED',payment:{subscription:'sub_test'}}},out.res);assert.equal(out.out.status,200);assert.equal(out.out.body.duplicate,true);assert.deepEqual(paths,['/rest/v1/rpc/claim_billing_event']);
}));
