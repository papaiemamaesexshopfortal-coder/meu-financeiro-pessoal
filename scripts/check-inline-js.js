const fs = require("node:fs");
const vm = require("node:vm");
const html = fs.readFileSync("index.html", "utf8");
const scripts = [...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)].map(m => m[1]).filter(s => s.trim());
if (!scripts.length) throw new Error("Nenhum script inline encontrado em index.html");
for (const [i, source] of scripts.entries()) {
  try { new vm.Script(source, { filename: "index.html:inline-script-" + (i + 1) }); }
  catch (error) { console.error(error); process.exitCode = 1; }
}
if (!process.exitCode) console.log("JavaScript inline validado: " + scripts.length + " bloco(s).");
