const fs=require('node:fs');
const dir='supabase/migrations';const file=fs.readdirSync(dir).find(n=>n.endsWith('_transactional_billing.sql'));
if(!file)throw Error('Billing migration not found');
let sql=fs.readFileSync(dir+'/'+file,'utf8');
for(const [name,temp] of Object.entries({subscriptions:'bt_subscriptions',billing_events:'bt_events',billing_customer_links:'bt_customer_links',billing_inbox:'bt_inbox'}))sql=sql.replaceAll('public.'+name,'pg_temp.'+temp);
for(const name of ['claim_checkout','claim_billing_event','finish_billing_event','claim_billing_cancellation','finish_billing_cancellation'])sql=sql.replaceAll('public.'+name,'pg_temp.bt_'+name);
sql=sql.replaceAll('references auth.users(id)','');
process.stdout.write('begin;\ncreate temporary table bt_subscriptions (like public.subscriptions including all);\ncreate temporary table bt_events (like public.billing_events including all);\n'+sql+'\n'+fs.readFileSync('tests/billing-db.assertions.sql','utf8'));
