export function csvCell(value) {
  let text=String(value??'');
  if(typeof value!=='number'&&/^[\s\uFEFF]*[=+\-@]/u.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
export function serializeCsv(rows) {return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');}
export function parseCsv(input) {
  const text=input.replace(/^\uFEFF/,'');let quoted=false,semicolons=0,commas=0;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){i++;continue}quoted=!quoted}else if(!quoted){if(c==='\r'||c==='\n')break;if(c===';')semicolons++;if(c===',')commas++;}}
  const separator=semicolons>=commas?';':',';const rows=[];let row=[],cell='';quoted=false;
  const finish=()=>{row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell='';};
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
   else if(!quoted&&c===separator){row.push(cell);cell='';}
   else if(!quoted&&(c==='\r'||c==='\n')){finish();if(c==='\r'&&text[i+1]==='\n')i++;}
   else cell+=c;
  }
  if(quoted)throw new Error('INVALID_CSV');if(cell.length||row.length)finish();return rows;
}
export async function exportFile(content,name,type,options={}) {
  if(!/^[a-zA-Z0-9_.-]+\.(?:csv|json)$/.test(name)||name.startsWith('.'))throw new Error('INVALID_EXPORT_NAME');
  const native=options.native??globalThis.Capacitor?.isNativePlatform?.()??false;
  if(native){const adapter=await (options.loadNative??(()=>import('./vendor/native-files.js')))();await adapter.shareExport(content,name);return 'native';}
  const doc=options.document??globalThis.document,urlApi=options.URL??globalThis.URL,BlobType=options.Blob??globalThis.Blob;
  const url=urlApi.createObjectURL(new BlobType([content],{type}));
  const anchor=doc.createElement('a');anchor.href=url;anchor.download=name;
  try{doc.body.appendChild(anchor);anchor.click();}finally{anchor.remove();setTimeout(()=>urlApi.revokeObjectURL(url),1000);}
  return 'web';
}
