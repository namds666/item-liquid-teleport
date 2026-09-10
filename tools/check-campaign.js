#!/usr/bin/env node
// Static gate: every block and unit this mod defines must be usable in campaign
// without research. Exit 1 and list violations otherwise. Usage: node tools/check-campaign.js [repoRoot] [--quiet]
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const root = args.find(a => !a.startsWith("--")) || path.resolve(__dirname, "..");
const scriptsDir = path.join(root, "scripts");
const SKIP = new Set(["lib.js", "main.js", "chrono-boost-rules.js"]);

const mainSrc = fs.readFileSync(path.join(scriptsDir, "main.js"), "utf8");
const registered = new Set([...mainSrc.matchAll(/"([\w-]+)"/g)].map(m => m[1]));

const violations = [];
const seen = [];

for (const file of fs.readdirSync(scriptsDir).filter(f => f.endsWith(".js") && !SKIP.has(f)).sort()) {
    const src = fs.readFileSync(path.join(scriptsDir, file), "utf8");
    const base = file.replace(/\.js$/, "");
    const decls = [...src.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*extend(?:Content)?\(\s*([\w.]+)\s*,\s*"([^"]+)"/g)];
    if (decls.length === 0) continue;
    if (!registered.has(base)) violations.push(`${file}: not listed in scripts/main.js optionalScripts, so the game never loads it`);

    for (const [, v, cls, name] of decls) {
        const has = re => new RegExp(re.replace(/VAR/g, v)).test(src);
        if (cls === "StatusEffect") { seen.push(`${name} (status)`); continue; }
        const kind = cls === "UnitType" ? "unit" : "block";
        seen.push(`${name} (${kind})`);
        if (!has(String.raw`\bVAR\.alwaysUnlocked\s*=\s*true\b`)) {
            violations.push(`${file}: ${name} lacks "${v}.alwaysUnlocked = true" -> locked behind research in campaign`);
        }
        if (kind === "block") {
            if (!has(String.raw`\bVAR\.buildVisibility\s*=\s*BuildVisibility\.shown\b`)) {
                violations.push(`${file}: ${name} lacks "${v}.buildVisibility = BuildVisibility.shown" -> hidden from the build menu`);
            }
            if (has(String.raw`\bVAR\.buildVisibility\s*=\s*BuildVisibility\.(sandboxOnly|editorOnly|debugOnly|hidden)\b`)) {
                violations.push(`${file}: ${name} uses a non-campaign buildVisibility`);
            }
            if (!has(String.raw`enableAllEnvironments\(\s*VAR\s*\)`) && !has(String.raw`\bVAR\.envEnabled\s*=`)) {
                violations.push(`${file}: ${name} does not call lib.enableAllEnvironments(${v}) -> may be unplaceable on Erekir or space maps`);
            }
        }
    }
}

if (!quiet) {
    for (const s of seen) console.log("checked " + s);
}
if (violations.length) {
    console.error("CAMPAIGN AVAILABILITY FAIL (" + violations.length + "):");
    for (const v of violations) console.error("  - " + v);
    process.exit(1);
}
if (!quiet) console.log("CAMPAIGN AVAILABILITY PASS: " + seen.length + " content entries are always unlocked and buildable.");
