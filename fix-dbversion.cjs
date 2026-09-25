const fs = require("fs");
const path = require("path");

function walk(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const files = walk("lib");
let count = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const next = src.replace(
    /const DB_VERSION = 1;/g,
    "const DB_VERSION = 2;"
  );
  if (next !== src) {
    fs.writeFileSync(f, next, "utf8");
    console.log("✔", f);
    count++;
  }
}
console.log(`\n共修改 ${count} 个文件`);
