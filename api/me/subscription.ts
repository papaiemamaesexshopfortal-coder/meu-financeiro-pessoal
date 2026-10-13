import type {VercelRequest,VercelResponse} from '../_lib/http';
import {method,requireUser} from '../_lib/supabase';
import {effectivePlan,implementedFeatures} from '../_lib/entitlements';
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store');
 if(!method(req,res,['GET']))return;
 const user=await requireUser(req,res);if(!user)return;
 try{const {plan,status,expires_at}=await effectivePlan(user.id);return res.status(200).json({data:{status,expires_at,plans:plan},access_active:true,available_features:[...implementedFeatures]});}
 catch {return res.status(503).json({error:{code:'SUBSCRIPTION_UNAVAILABLE',message:'Não foi possível consultar sua assinatura.'}});}
}
