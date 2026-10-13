const fs = require("node:fs");
const vm = require("node:vm");
const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf("<script>");
const end = html.indexOf("</script>", start + 8);
if (start < 0 || end < 0) throw new Error("Script inline não encontrado em index.html");
const source = html.slice(start + 8, end);
new vm.Script(source, { filename: "index.html:inline-script" });
console.log("JavaScript inline validado.");
