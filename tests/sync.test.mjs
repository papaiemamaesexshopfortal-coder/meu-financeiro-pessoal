import test from 'node:test';
import assert from 'node:assert/strict';
import {FinanceSync} from '../cloud-sync.mjs';
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
function client(response){const calls=[];const q={};for(const method of ['select','eq','update','insert'])q[method]=(...args)=>{calls.push([method,...args]);return q};q.maybeSingle=async()=>response;return {calls,from:()=>q}}
test('pending offline edits survive a cloud load and conflicting revision is rejected',async()=>{
 const s=storage();s.setItem('user:pending','true');s.setItem('user:revision','old');
 const c=client({data:{data:{remote:true},updated_at:'new'}});const sync=new FinanceSync(c,'u',s,'user');
 await assert.rejects(sync.load({local:true}),/SYNC_CONFLICT/);assert.equal(s.getItem('user:pending'),'true');
});
test('save requires ownership and the exact revision previously read',async()=>{
 const s=storage();s.setItem('user:revision','old');const c=client({data:null,error:null});const sync=new FinanceSync(c,'u',s,'user');sync.markPending();
 await assert.rejects(sync.save({accounts:[]}),/SYNC_CONFLICT/);
 assert.ok(c.calls.some(x=>x[0]==='eq'&&x[1]==='user_id'&&x[2]==='u'));
 assert.ok(c.calls.some(x=>x[0]==='eq'&&x[1]==='updated_at'&&x[2]==='old'));
 assert.equal(s.getItem('user:pending'),'true');
});
test('new profile insert collision never becomes an overwriting upsert',async()=>{
 const c=client({error:{code:'23505'}});const sync=new FinanceSync(c,'u',storage(),'user');await assert.rejects(sync.save({}),/SYNC_CONFLICT/);assert.equal(c.calls[0][0],'insert');
});
test('old session requests cannot acknowledge or save a different profile',async()=>{
 const s=storage(),c=client({data:{updated_at:'new'}}),sync=new FinanceSync(c,'old-user',s,'old');sync.stop();await sync.save({});assert.equal(c.calls.length,0);
});
test('server validation and permission failures preserve pending edits with distinct actionable errors',async()=>{
 for(const [error,message] of [[{code:'23514',message:'ACCOUNT_LIMIT_EXCEEDED'},'ACCOUNT_LIMIT_EXCEEDED'],[{code:'23514',message:'INVALID_FINANCE_DOCUMENT'},'INVALID_FINANCE_DOCUMENT'],[{code:'42501'},'SYNC_ACCESS_DENIED'],[{code:'PGRST301'},'SYNC_ACCESS_DENIED'],[{message:'network unavailable'},'OFFLINE']]){
  const s=storage();s.setItem('user:revision','old');const sync=new FinanceSync(client({error}),'u',s,'user');sync.markPending();
  await assert.rejects(sync.save({accounts:[]}),{message});assert.equal(s.getItem('user:pending'),'true');assert.equal(s.getItem('user:revision'),'old');
 }
});
