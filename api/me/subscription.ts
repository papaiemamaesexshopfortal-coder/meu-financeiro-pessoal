import type {VercelRequest,VercelResponse} from '../_lib/http';
import {method,requireUser,publicClient} from '../_lib/supabase';
import {effectivePlan} from '../_lib/entitlements';
import {billingEnabled,sandboxUserAllowed} from '../_lib/billing-safety';
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store');
 if(!method(req,res,['GET']))return;
 const user=await requireUser(req,res);if(!user)return;
 try{const token=req.headers.authorization!.slice(7);const {plan,status,expires_at}=await effectivePlan(user.id,token);const {data:billing,error}=await publicClient(token).from('subscriptions').select('id,status,expires_at,canceled_at').eq('user_id',user.id).eq('billing_environment','sandbox').order('started_at',{ascending:false}).limit(1).maybeSingle();if(error&&!['42703','PGRST204'].includes(error.code))throw error;return res.status(200).json({data:{status,expires_at,plans:plan},access_active:true,available_features:Object.keys(plan.features).filter(key=>plan.features[key]),billing:{sandbox_available:!error&&billingEnabled()&&sandboxUserAllowed(user.id),subscription:billing}});}
 catch {return res.status(503).json({error:{code:'SUBSCRIPTION_UNAVAILABLE',message:'Não foi possível consultar sua assinatura.'}});}
}
