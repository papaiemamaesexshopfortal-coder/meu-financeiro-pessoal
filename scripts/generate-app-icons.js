const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
async function main(){
 const source=fs.readFileSync('icon.svg'),directory=path.join(process.cwd(),'icons');fs.mkdirSync(directory,{recursive:true});
 for(const size of [180,192,512])await sharp(source).resize(size,size).flatten({background:'#073b35'}).png().toFile(path.join(directory,`icon-${size}.png`));
 const foreground=await sharp(source).resize(360,360).png().toBuffer();
 await sharp({create:{width:512,height:512,channels:4,background:'#073b35'}}).composite([{input:foreground,left:76,top:76}]).flatten({background:'#073b35'}).png().toFile(path.join(directory,'icon-maskable-512.png'));
 console.log('PWA and Apple touch icons generated.');
}
main().catch(error=>{console.error(error.message);process.exit(1)});
