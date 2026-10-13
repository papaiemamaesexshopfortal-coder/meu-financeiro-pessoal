import {clients} from './supabase';
export const implementedFeatures = new Set(['manual_transactions','basic_charts','advanced_reports','corporate_dre']);
export async function effectivePlan(userId:string) {
 const {admin}=clients();
 const {data:sub,error}=await admin.from('subscriptions').select('status,expires_at,plans(code,name,price_monthly,currency,features,limit_bank_accounts,limit_issuances)').eq('user_id',userId).in('status',['active','trialing']).order('started_at',{ascending:false}).limit(1).maybeSingle();
 if(error)throw error;
 const valid=!!sub&&(!sub.expires_at||new Date(sub.expires_at).getTime()>Date.now());
 if(valid){const plan=Array.isArray(sub.plans)?sub.plans[0]:sub.plans;if(plan)return {plan,status:sub.status,expires_at:sub.expires_at};}
 const {data:plan,error:freeError}=await admin.from('plans').select('code,name,price_monthly,currency,features,limit_bank_accounts,limit_issuances').eq('code','free').eq('is_active',true).single();
 if(freeError||!plan)throw freeError||new Error('FREE_PLAN_MISSING');
 return {plan,status:'free',expires_at:null};
}
