import test from 'node:test';
import assert from 'node:assert/strict';
import {csvCell,serializeCsv,parseCsv,exportFile} from '../file-export.mjs';

test('CSV neutralizes spreadsheet formulas in imported text while retaining numeric amounts',()=>{
 for(const value of ['=WEBSERVICE("https://example.invalid")',' +SUM(A1:A2)','\t@SUM(A1:A2)','-10+20','\r\n=1+1'])assert.equal(csvCell(value),'"\''+value.replace(/"/g,'""')+'"');
 assert.equal(csvCell(-12.50),'"-12.5"');
 assert.equal(serializeCsv([['data','descrição','valor'],['2026-10-13','Almoço; café "bom"',12.5]]),'\uFEFF"data";"descrição";"valor"\r\n"2026-10-13";"Almoço; café ""bom""";"12.5"');
});
test('Android export uses its native adapter and never creates a browser download',async()=>{
 const calls=[];
 const result=await exportFile('{"transactions":[]}','backup.json','application/json',{native:true,loadNative:async()=>({shareExport:async(...args)=>calls.push(args)}),document:{createElement(){throw Error('BROWSER_DOWNLOAD_USED')}}});
 assert.equal(result,'native');assert.deepEqual(calls,[['{"transactions":[]}','backup.json']]);
});
test('CSV reads quoted separators, line breaks and escaped quotes without creating spurious transactions',()=>{
 const rows=[['data','descricao','valor'],['2026-10-15','Compra; observação\nsegunda linha "texto"',12.5]];
 assert.deepEqual(parseCsv(serializeCsv(rows)),[['data','descricao','valor'],['2026-10-15','Compra; observação\nsegunda linha "texto"','12.5']]);
 assert.deepEqual(parseCsv('data,descricao,valor\r\n2026-10-15,"Texto, com vírgula",10\r\n'),[['data','descricao','valor'],['2026-10-15','Texto, com vírgula','10']]);
 assert.throws(()=>parseCsv('data;descricao\n2026-10-15;"incompleto'),/INVALID_CSV/);
});
test('failed native export remains a failure and unsafe file names never reach the adapter',async()=>{
 let calls=0;
 const options={native:true,loadNative:async()=>{calls++;return{shareExport:async()=>{throw Error('STORAGE_FULL')}}}};
 await assert.rejects(exportFile('data','backup.json','application/json',options),/STORAGE_FULL/);
 for(const name of ['../backup.json','folder/backup.csv','.backup.json','backup.exe'])await assert.rejects(exportFile('data',name,'application/json',options),/INVALID_EXPORT_NAME/);
 assert.equal(calls,1);
});
test('web export retains MIME, download name and document cleanup',async()=>{
 let clicked=false,removed=false,appended=false,blob;
 const anchor={click(){clicked=true},remove(){removed=true}};
 const result=await exportFile('data','backup.json','application/json',{native:false,document:{createElement:()=>anchor,body:{appendChild(){appended=true}}},URL:{createObjectURL(value){blob=value;return'blob:test'},revokeObjectURL(){}},Blob});
 assert.equal(result,'web');assert.equal(anchor.download,'backup.json');assert.equal(anchor.href,'blob:test');assert.equal(blob.type,'application/json');assert.equal(await blob.text(),'data');assert.ok(clicked&&removed&&appended);
});
