import test from 'node:test';
import assert from 'node:assert/strict';
import plans from '../api/plans';
import {effectivePlan} from '../api/_lib/entitlements';

async function withProvider(fn:()=>Promise<void>){
 const oldFetch=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_ANON_KEY;
 process.env.SUPABASE_URL='https://example.test';process.env.SUPABASE_ANON_KEY='public-test-key';
 try{await fn()}finally{globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_ANON_KEY;else process.env.SUPABASE_ANON_KEY=oldKey;}
}
test('public catalog exposes implemented capabilities and preserves configured prices',()=>withProvider(async()=>{
 const source={code:'mei_pme_pro',price_monthly:249.9,limit_bank_accounts:10,limit_issuances:500,features:{manual_transactions:true,advanced_reports:true,corporate_dre:true,bank_sync:true,ai_categorization:true,invoice_issuance:true,boleto_pix:true}};
 globalThis.fetch=async()=>new Response(JSON.stringify([source]),{status:200,headers:{'Content-Type':'application/json'}});
 let body:any,status=0;const response:any={setHeader(){},status(value:number){status=value;return this},json(value:any){body=value;return this}};
 await plans({method:'GET',headers:{}} as any,response);
 assert.equal(status,200);assert.equal(body.data[0].price_monthly,249.9);assert.equal(body.data[0].limit_bank_accounts,10);assert.equal(body.data[0].limit_issuances,0);
 assert.equal(body.data[0].features.advanced_reports,true);
 for(const key of ['bank_sync','ai_categorization','invoice_issuance','boleto_pix']){assert.equal(body.data[0].features[key],false);assert.ok(body.data[0].planned_features.includes(key));}
 assert.equal(source.features.bank_sync,true);
}));
test('a disabled paid plan cannot grant access even with a settled future period',()=>withProvider(async()=>{
 let freeRequested=false;
 globalThis.fetch=async(input:any)=>{const url=String(input);if(url.includes('/subscriptions'))return new Response(JSON.stringify([{status:'active',expires_at:'2099-01-01T00:00:00Z',plans:{code:'premium',is_active:false,features:{advanced_reports:true}}}]),{status:200,headers:{'Content-Type':'application/json'}});freeRequested=true;return new Response(JSON.stringify({code:'free',features:{manual_transactions:true,advanced_reports:false},limit_bank_accounts:1}),{status:200,headers:{'Content-Type':'application/json'}})};
 const result=await effectivePlan('test-user','test-token');assert.equal(result.plan.code,'free');assert.equal(result.plan.features.advanced_reports,false);assert.equal(freeRequested,true);
}));
