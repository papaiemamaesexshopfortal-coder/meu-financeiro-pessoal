type Options = {method?:'GET'|'POST'|'PUT'|'DELETE';body?:unknown};
export class AsaasError extends Error {constructor(public status:number){super('ASAAS_REQUEST_FAILED');}}
export async function asaasRequest<T>(path:string,options:Options={}):Promise<T>{
 if(process.env.ASAAS_ENVIRONMENT!=='sandbox')throw Error('Real billing is disabled pending validation');
 const key=process.env.ASAAS_API_KEY;if(!key)throw Error('ASAAS_NOT_CONFIGURED');
 if(!path.startsWith('/')||path.startsWith('//'))throw Error('INVALID_ASAAS_PATH');
 const response=await fetch('https://api-sandbox.asaas.com/v3'+path,{method:options.method||'GET',
 headers:{access_token:key,'Content-Type':'application/json',Accept:'application/json','User-Agent':'MeuFinanceiroPessoal/1.0'},
 body:options.body===undefined?undefined:JSON.stringify(options.body),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new AsaasError(response.status);
 return await response.json() as T;
}
