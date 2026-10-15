const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
if(/<script(?![^>]*\bsrc=)/i.test(html))throw Error('Inline scripts are not permitted by the security policy');
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
config.headers=[{source:'/(.*)',headers:[
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'X-Frame-Options',value:'DENY'},
 {key:'Referrer-Policy',value:'no-referrer'},
 {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=()'},
 {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://mjiopkegmtmqwvvikxih.supabase.co wss://mjiopkegmtmqwvvikxih.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"}
]}];
fs.writeFileSync('vercel.json',JSON.stringify(config,null,2)+'\n');
console.log('Security headers allow local scripts and the configured Supabase origin.');
