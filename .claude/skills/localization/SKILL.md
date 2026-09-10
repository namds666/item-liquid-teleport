---
name: localization
description: Add, fix, or complete translations for this Mindustry mod in all 35 languages Mindustry ships. Use whenever you add or rename a block, unit, status, or outpost UI string in scripts/, add a key to bundles/bundle.properties, change subtitle or description in mod.hjson, or when node tools/check-localize.js fails or the user reports English text in a non-English game. Mandatory for this repo; never skip it.
---

# Localization

The owner's standing rule: **every string a player can see is translated in every language Mindustry ships.** English lives in `bundles/bundle.properties` (content strings) and `mod.hjson` (displayName, subtitle, description). Each of the 34 other languages has `bundles/bundle_<locale>.properties` with the same keys plus the three mod meta keys.

## Locales

| file suffix | language | | file suffix | language |
|---|---|---|---|---|
| be | Belarusian | | nl | Dutch |
| bg | Bulgarian | | nl_BE | Dutch (Belgium) |
| ca | Catalan | | pl | Polish |
| cs | Czech | | pt_BR | Portuguese (Brazil) |
| da | Danish | | pt_PT | Portuguese (Portugal) |
| de | German | | ro | Romanian |
| es | Spanish | | ru | Russian |
| et | Estonian | | sr | Serbian (Cyrillic) |
| eu | Basque | | sv | Swedish |
| fi | Finnish | | th | Thai |
| fil | Filipino | | tk | Turkmen |
| fr | French | | tr | Turkish |
| hu | Hungarian | | uk_UA | Ukrainian |
| id_ID | Indonesian | | vi | Vietnamese |
| it | Italian | | zh_CN | Chinese (Simplified) |
| ja | Japanese | | zh_TW | Chinese (Traditional) |
| ko | Korean | | | |
| lt | Lithuanian | | | |

The list is `LOCALES` in `tools/check-localize.js`. If Mindustry adds a language (check `core/assets/bundles/` in Anuken/Mindustry), add it there and create the file.

## Key rules

- Block: `block.item-liquid-teleport-<name>.name` and `.description`. Unit: `unit.…`. Status: `status.…`. `<name>` is the string passed to `extend(...)`, `makeStatus(...)`, or the `name:`/`unitName:` factory field.
- Outpost UI: `outpost.<key>` for each `bundle("<key>")` call in `scripts/outpost.js`.
- Mod meta, in locale files only: `item-liquid-teleport.displayName`, `item-liquid-teleport.subtitle`, `item-liquid-teleport.description`. Never put these in `bundle.properties`.
- The subtitle keeps the `v<version>:` prefix from `mod.hjson`. When the version changes, retranslate subtitle and description in all 34 files.

## Translation rules

- One line per key. Newlines inside a value are the two characters `\n`. Never let a description spill onto a following line; the game reads it as a broken key.
- Keep `{0}`, `{1}` placeholders exactly; reorder them if the grammar needs it.
- Keep Mindustry's own terms as its official translation for that language uses them: core, conveyor, ore, unit, drone, overdrive, mine tier. When unsure, look at `bundle_<locale>.properties` in Anuken/Mindustry.
- "Chrono" is the brand prefix. Translate or transliterate it once per language and use the same form in every key of that file (for example zh_CN uses 时空, ru can use Хроно).
- Translate, do not copy English. `.description` values identical to English fail the check. Names identical to English pass with a warning only when the word is the same in that language (for example "Max").
- Files are UTF-8, no BOM.

## Procedure

1. After editing `scripts/*.js`, `bundles/*.properties`, or `mod.hjson`, run:
   ```bash
   node tools/check-localize.js
   ```
   Fix every line it reports.
2. For a new key: add English to `bundles/bundle.properties`, then add the translated line to all 34 locale files. For many keys or many languages, fan out subagents by language group; give each agent the English lines, `bundle_zh_CN.properties` as a format example, and the rules above.
3. For a version bump: update `item-liquid-teleport.subtitle` and `.description` in all 34 locale files.
4. Before committing, run the check again. `.githooks/pre-commit` and the Claude Code Stop hook run the same script and refuse to proceed on failure.
5. When strings were added, also spawn the `localization-checker` agent for an independent read, and include its first line in your report.
6. In the final message to the user, state: "Localization check: PASS (34 locales, N keys)". If it did not pass, the work is not done.
