import {publicClient} from './supabase';
export const implementedFeatures = new Set(['manual_transactions','basic_charts','advanced_reports','corporate_dre']);
export function publicPlan<T extends {features?: unknown; limit_issuances?: number | null}>(plan:T) {
 const source=plan.features&&typeof plan.features==='object'&&!Array.isArray(plan.features)?plan.features as Record<string,unknown>:{};
 const features=Object.fromEntries(Object.entries(source).map(([key,value])=>[key,value===true&&implementedFeatures.has(key)]));
 return {...plan,features,limit_issuances:features.invoice_issuance?plan.limit_issuances:0,
 planned_features:Object.keys(source).filter(key=>source[key]===true&&!implementedFeatures.has(key))};
}
export function hasPlanAccess(code:string,status:string,expiresAt:string|null,now=Date.now()) {
 if(!['active','trialing'].includes(status))return false;
 if(!expiresAt)return code==='free';
 return new Date(expiresAt).getTime()>now;
}
export async function effectivePlan(userId:string,token:string) {
 const admin=publicClient(token);
 const {data:sub,error}=await admin.from('subscriptions').select('status,expires_at,plans(code,name,price_monthly,currency,features,limit_bank_accounts,limit_issuances,is_active)').eq('user_id',userId).in('status',['active','trialing']).order('started_at',{ascending:false}).limit(1).maybeSingle();
 if(error)throw error;
 const valid=!!sub&&(!sub.expires_at||new Date(sub.expires_at).getTime()>Date.now());
 if(valid){const plan=Array.isArray(sub.plans)?sub.plans[0]:sub.plans;if(plan?.is_active===true&&hasPlanAccess(plan.code,sub.status,sub.expires_at))return {plan:publicPlan(plan),status:sub.status,expires_at:sub.expires_at};}
 const {data:plan,error:freeError}=await admin.from('plans').select('code,name,price_monthly,currency,features,limit_bank_accounts,limit_issuances').eq('code','free').eq('is_active',true).single();
 if(freeError||!plan)throw freeError||new Error('FREE_PLAN_MISSING');
 return {plan:publicPlan(plan),status:'free',expires_at:null};
}
