#!/usr/bin/env node
// Static gate: every user-facing string this mod defines must be translated in every
// language Mindustry ships. Exit 1 and list violations otherwise.
// Usage: node tools/check-localize.js [repoRoot] [--quiet] [--keys]
const fs = require("fs");
const path = require("path");

const LOCALES = ["be", "bg", "ca", "cs", "da", "de", "es", "et", "eu", "fi", "fil", "fr", "hu", "id_ID", "it", "ja", "ko", "lt", "nl", "nl_BE", "pl", "pt_BR", "pt_PT", "ro", "ru", "sr", "sv", "th", "tk", "tr", "uk_UA", "vi", "zh_CN", "zh_TW"];
const MOD = "item-liquid-teleport";
const META_KEYS = ["displayName", "subtitle", "description"].map(k => MOD + "." + k);

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const printKeys = args.includes("--keys");
const root = args.find(a => !a.startsWith("--")) || path.resolve(__dirname, "..");
const bundlesDir = path.join(root, "bundles");
const scriptsDir = path.join(root, "scripts");

const violations = [];
const warnings = [];

function parseProperties(file) {
    const map = new Map();
    const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
    const lines = raw.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        while (/\\$/.test(line) && i + 1 < lines.length) line = line.slice(0, -1) + lines[++i].replace(/^\s+/, "");
        if (!line.trim() || /^\s*[#!]/.test(line)) continue;
        const m = line.match(/^\s*([^=:\s]+)\s*[=:]\s*(.*)$/);
        if (!m) { violations.push(`${path.relative(root, file)}:${i + 1}: line is not "key = value" (a description spilled onto a new line? join it with \\n)`); continue; }
        if (map.has(m[1])) violations.push(`${path.relative(root, file)}:${i + 1}: duplicate key ${m[1]}`);
        map.set(m[1], m[2].trim());
    }
    return map;
}

function expectedKeysFromScripts() {
    const keys = new Set();
    const src = fs.readdirSync(scriptsDir).filter(f => f.endsWith(".js")).map(f => fs.readFileSync(path.join(scriptsDir, f), "utf8")).join("\n");
    const add = (kind, name) => { keys.add(`${kind}.${MOD}-${name}.name`); keys.add(`${kind}.${MOD}-${name}.description`); };
    for (const [, cls, name] of src.matchAll(/extend(?:Content)?\(\s*([\w.]+)\s*,\s*"([^"]+)"/g)) {
        if (cls === "StatusEffect") add("status", name);
        else if (cls === "UnitType") add("unit", name);
        else add("block", name);
    }
    for (const [, name] of src.matchAll(/makeStatus\(\s*"([^"]+)"/g)) add("status", name);
    for (const [, name] of src.matchAll(/^\s*name\s*:\s*"([\w-]+)"/gm)) add("block", name);
    for (const [, name] of src.matchAll(/^\s*unitName\s*:\s*"([\w-]+)"/gm)) add("unit", name);
    const prefixes = new Set();
    for (const [, key] of src.matchAll(/\bbundle\(\s*"([^"]+)"/g)) {
        if (key.endsWith(".")) prefixes.add("outpost." + key); else keys.add("outpost." + key);
    }
    return { keys, prefixes };
}

const placeholders = v => (v.match(/\{\d+\}/g) || []).sort().join("");
const version = (fs.readFileSync(path.join(root, "mod.hjson"), "utf8").match(/^\s*version:\s*"([^"]+)"/m) || [])[1];

const defaultFile = path.join(bundlesDir, "bundle.properties");
const en = parseProperties(defaultFile);
for (const k of META_KEYS) if (en.has(k)) violations.push(`bundles/bundle.properties: ${k} must not be here; English mod text lives in mod.hjson`);

const { keys: expected, prefixes } = expectedKeysFromScripts();
for (const k of expected) if (!en.has(k)) violations.push(`bundles/bundle.properties: missing ${k} (used by scripts/)`);
for (const p of prefixes) if (![...en.keys()].some(k => k.startsWith(p))) violations.push(`bundles/bundle.properties: no key starts with ${p} (used by scripts/)`);
for (const k of en.keys()) if (!en.get(k)) violations.push(`bundles/bundle.properties: ${k} is empty`);

const checked = [];
for (const loc of LOCALES) {
    const rel = `bundles/bundle_${loc}.properties`;
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) { violations.push(`${rel}: missing; every Mindustry language needs a bundle`); continue; }
    const tr = parseProperties(file);
    let missing = 0;
    for (const [k, v] of en) {
        if (!tr.has(k) || !tr.get(k)) { missing++; violations.push(`${rel}: missing ${k}`); continue; }
        const t = tr.get(k);
        if (placeholders(t) !== placeholders(v)) violations.push(`${rel}: ${k} placeholders ${placeholders(t) || "(none)"} differ from English ${placeholders(v) || "(none)"}`);
        if (t === v) {
            if (k.endsWith(".description")) violations.push(`${rel}: ${k} is identical to English -> not translated`);
            else warnings.push(`${rel}: ${k} is identical to English ("${v}")`);
        }
    }
    for (const k of META_KEYS) {
        if (!tr.has(k) || !tr.get(k)) violations.push(`${rel}: missing ${k} (translate it from mod.hjson)`);
    }
    const sub = tr.get(MOD + ".subtitle");
    if (version && sub && !sub.startsWith("v" + version)) violations.push(`${rel}: ${MOD}.subtitle starts with "${sub.slice(0, 12)}" but mod.hjson version is ${version}; retranslate subtitle and description`);
    for (const k of tr.keys()) if (!en.has(k) && !META_KEYS.includes(k)) violations.push(`${rel}: stale key ${k} not in bundle.properties`);
    checked.push(`${loc} (${en.size - missing}/${en.size})`);
}

if (printKeys) for (const k of en.keys()) console.log(k);
if (!quiet) {
    for (const c of checked) console.log("checked " + c);
    for (const w of warnings) console.log("warn " + w);
}
if (violations.length) {
    console.error("LOCALIZATION FAIL (" + violations.length + "):");
    const shown = args.includes("--all") ? violations : violations.slice(0, 60);
    for (const v of shown) console.error("  - " + v);
    if (violations.length > shown.length) console.error(`  ... ${violations.length - shown.length} more; see all with: node tools/check-localize.js --all`);
    process.exit(1);
}
if (!quiet) console.log(`LOCALIZATION PASS: ${LOCALES.length} locales x ${en.size} keys + ${META_KEYS.length} meta keys each.`);
