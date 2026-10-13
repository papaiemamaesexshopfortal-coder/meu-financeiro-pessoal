import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {FinanceSync} from '../cloud-sync.mjs';
const html=readFileSync('index.html','utf8');
async function fixture(initial={accounts:[{id:'a',name:'Conta',type:'Conta corrente',balance:0}],transactions:[],budgets:[],goals:[],categories:[],profile:{name:'Pessoa'}}){
 const dom=new JSDOM(html,{url:'https://app.test',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 const errors=[];w.addEventListener('error',e=>errors.push(e.error));w.scrollTo=()=>{};w.confirm=()=>true;
 let session={user:{id:'test-user',email:'test@example.invalid'},access_token:'test'};let callback;let writes=0;
 const plan={code:'free',name:'Gratuito',price_monthly:0,limit_bank_accounts:1};
 w.fetch=async path=>({ok:true,json:async()=>path.endsWith('/api/me/subscription')?{data:{plans:plan}}:path.endsWith('/api/plans')?{data:[plan]}:{url:'https://example.test',anonKey:'public'}});
 const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{data:initial,updated_at:'2026-01-01T00:00:00.000Z'}}),update:()=>{writes++;return q},insert:()=>{writes++;return q}};
 const client={from:()=>q,auth:{getSession:async()=>({data:{session}}),onAuthStateChange:f=>callback=f,signOut:async()=>{session=null;callback('SIGNED_OUT',null);return {}},signInWithPassword:async()=>({}),signUp:async()=>({data:{},error:null}),resetPasswordForEmail:async()=>({})}};
 w.__sdk={createClient:()=>client};w.__sync={FinanceSync};
 let source=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace("import('./vendor/supabase.js')","Promise.resolve(window.__sdk)").replace("import('./cloud-sync.mjs')","Promise.resolve(window.__sync)");
 w.eval(source);await new Promise(r=>setTimeout(r,60));
 return {dom,w,errors,getWrites:()=>writes};
}
test('login loads data, navigation does not write, logout preserves previous user data',async()=>{
 const f=await fixture();try{
 assert.equal(f.w.document.body.classList.contains('signed-in'),true);assert.equal(f.w.document.querySelector('#userName').value,'Pessoa');
 const key='meu-financeiro-v1-user-test-user',before=f.w.localStorage.getItem(key);
 f.w.document.querySelector('[data-page="reports"]').click();assert.equal(f.getWrites(),0);
 f.w.document.querySelector('#authProfile').click();await new Promise(r=>setTimeout(r,30));
 assert.equal(f.w.document.body.classList.contains('signed-in'),false);assert.equal(f.w.localStorage.getItem(key),before);assert.equal(f.getWrites(),0);assert.deepEqual(f.errors,[]);
 }finally{f.dom.window.close()}
});
test('free plan rejects a second account and saving a transaction persists locally',async()=>{
 const f=await fixture();try{
 f.w.document.querySelector('#newAccountBtn').click();assert.equal(f.w.document.querySelector('#modalBack').classList.contains('show'),false);assert.match(f.w.document.querySelector('#toast').textContent,/Limite/);
 f.w.document.querySelector('#newTxBtn').click();f.w.document.querySelector('#f_description').value='Compra';f.w.document.querySelector('#f_amount').value='10';
 f.w.document.querySelector('#modalForm').dispatchEvent(new f.w.Event('submit',{cancelable:true}));
 const data=JSON.parse(f.w.localStorage.getItem('meu-financeiro-v1-user-test-user'));assert.equal(data.transactions[0].description,'Compra');assert.equal(data.transactions[0].amount,10);assert.deepEqual(f.errors,[]);
 }finally{f.dom.window.close()}
});
test('malicious imported identifiers cannot create executable HTML attributes',async()=>{
 const f=await fixture({accounts:[{id:'a',name:'Conta',type:'Conta corrente',balance:0}],transactions:[{id:'" onmouseover="alert(1)',description:'<script>alert(1)</script>',type:'expense',date:'2026-10-13',amount:10,accountId:'a',category:'Outros'}],budgets:[],goals:[],categories:[],profile:{}});
 try{f.w.document.querySelector('[data-page="transactions"]').click();assert.equal(f.w.document.querySelector('[onmouseover]'),null);assert.deepEqual(f.errors,[])}finally{f.dom.window.close()}
});
