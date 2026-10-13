import type {IncomingHttpHeaders} from 'node:http';
// Structural types for the Vercel Node handler contract, without importing build tools.
export interface VercelRequest {
 method?:string;
 headers:IncomingHttpHeaders;
 body?:Record<string,any>;
}
export interface VercelResponse {
 setHeader(name:string,value:string|string[]):unknown;
 status(code:number):VercelResponse;
 json(body:unknown):unknown;
 end():unknown;
}
