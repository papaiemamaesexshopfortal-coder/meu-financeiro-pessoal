import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {billingEnabled,sandboxUserAllowed} from '../api/_lib/billing-safety';
import {asaasRequest} from '../api/_lib/asaas';

test('production billing is blocked even when sandbox flag is set',async()=>{
 const old={...process.env};
 try {process.env.ASAAS_API_KEY='test-key';process.env.BILLING_SANDBOX_ENABLED='true';
 for(const env of [undefined,'production','prod','']) {if(env===undefined)delete process.env.ASAAS_ENVIRONMENT;else process.env.ASAAS_ENVIRONMENT=env;assert.equal(billingEnabled(),false);await assert.rejects(asaasRequest('/subscriptions',{method:'POST'}),/disabled/)}
 process.env.ASAAS_ENVIRONMENT='sandbox';assert.equal(billingEnabled(),true);
 process.env.BILLING_TEST_USER_IDS='test-user';assert.equal(sandboxUserAllowed('test-user'),true);assert.equal(sandboxUserAllowed('other-user'),false);
 } finally {process.env=old}
});

test('service worker never intercepts API, authenticated or third-party responses',()=>{
 const handlers:Record<string,Function>={};
 vm.runInNewContext(readFileSync('sw.js','utf8'),{URL,self:{location:{origin:'https://app.test',href:'https://app.test/sw.js'},addEventListener:(n:string,f:Function)=>handlers[n]=f}});
 for(const [url,authorization] of [['https://app.test/api/me/subscription',false],['https://app.test/index.html',true],['https://other.test/data',false],['https://app.test/private.json',false]]){
 let intercepted=false;
 handlers.fetch({request:{url,method:'GET',mode:'cors',headers:{has:()=>authorization}},respondWith:()=>intercepted=true});
 assert.equal(intercepted,false,String(url));
 }
});

test('refresh and sign-out never persist an empty previous profile',()=>{
 const html=readFileSync('index.html','utf8');
 const refresh=html.slice(html.indexOf('function refresh()'),html.indexOf('function fillFilters()'));
 assert.equal(refresh.includes('persist()'),false);
 assert.equal(html.includes("await client.auth.signOut();db=seed();refresh()"),false);
 assert.equal(html.includes("await import('https://esm.sh/"),false);
});

import {hasPlanAccess} from '../api/_lib/entitlements';
test('paid plans require a current access period and settled subscription state',()=>{
 const now=Date.parse('2026-10-13T00:00:00Z');
 assert.equal(hasPlanAccess('premium','active',null,now),false);
 assert.equal(hasPlanAccess('premium','active','2026-10-12T00:00:00Z',now),false);
 assert.equal(hasPlanAccess('premium','active','invalid',now),false);
 assert.equal(hasPlanAccess('premium','past_due','2026-11-13T00:00:00Z',now),false);
 assert.equal(hasPlanAccess('premium','active','2026-11-13T00:00:00Z',now),true);
 assert.equal(hasPlanAccess('free','active',null,now),true);
});
