const fs = require("fs");
const path = require("path");
const root = process.cwd();
const out = path.join(root, "www");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of ["index.html", "app.js", "installation.js", "manifest.webmanifest", "sw.js", "icon.svg", "cloud-sync.mjs", "file-export.mjs"]) {
  if (fs.existsSync(path.join(root, file))) fs.copyFileSync(path.join(root, file), path.join(out, file));
}
console.log("Web assets copied to www/");

fs.cpSync(path.join(root,"vendor"),path.join(out,"vendor"),{recursive:true});
fs.cpSync(path.join(root,"icons"),path.join(out,"icons"),{recursive:true});
