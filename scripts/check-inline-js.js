const fs = require("node:fs");
const vm = require("node:vm");
const html = fs.readFileSync("index.html", "utf8");
if(!html.includes('<script defer src="./app.js"></script>'))throw Error('Referência do aplicativo ausente em index.html');
if(/<script(?![^>]*\bsrc=)/i.test(html))throw Error('Scripts inline precisam de revisão de segurança');
new vm.Script(fs.readFileSync('app.js','utf8'), {filename:'app.js'});
if(!html.includes('<script defer src="./installation.js"></script>'))throw Error('Referência de instalação ausente');
new vm.Script(fs.readFileSync('installation.js','utf8'), {filename:'installation.js'});
console.log('JavaScript do aplicativo validado.');
