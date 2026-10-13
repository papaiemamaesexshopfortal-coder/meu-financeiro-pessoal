import type {VercelRequest,VercelResponse} from './_lib/http';
import {method,requireUser} from './_lib/supabase';
import {effectivePlan,implementedFeatures} from './_lib/entitlements';
const known=new Set(['manual_transactions','basic_charts','bank_sync','ai_categorization','advanced_reports','invoice_issuance','boleto_pix','corporate_dre']);
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store');
 if(!method(req,res,['POST']))return;
 const user=await requireUser(req,res);if(!user)return;
 const feature=req.body?.feature;
 if(typeof feature!=='string'||!known.has(feature))return res.status(400).json({error:{code:'UNKNOWN_FEATURE'}});
 if(!implementedFeatures.has(feature))return res.status(501).json({error:{code:'FEATURE_NOT_RELEASED',message:'Recurso em desenvolvimento, indisponível para contratação.'}});
 try{const {plan}=await effectivePlan(user.id,req.headers.authorization!.slice(7));if(!(plan.features as Record<string,boolean>)?.[feature])return res.status(403).json({error:{code:'FEATURE_LOCKED',message:'Recurso indisponível no plano atual.'}});
 return res.status(200).json({data:{allowed:true,feature,plan:plan.code}});}
 catch{return res.status(503).json({error:{code:'AUTHORIZATION_UNAVAILABLE'}});}
}
