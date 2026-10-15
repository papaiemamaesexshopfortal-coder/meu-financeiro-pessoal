const {readdirSync}=require('node:fs');
const {join}=require('node:path');
const {spawnSync}=require('node:child_process');
const files=readdirSync('tests').filter(name=>/\.test\.(?:ts|mjs|cjs)$/.test(name)).sort().map(name=>join('tests',name));
if(!files.length)throw Error('No tests found');
const result=spawnSync(process.execPath,['--import','tsx','--test',...files],{stdio:'inherit',shell:false});
if(result.error)throw result.error;process.exit(result.status??1);
