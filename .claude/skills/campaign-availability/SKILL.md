---
name: campaign-availability
description: Make sure every block and unit in this Mindustry mod is available in the normal campaign without research. Use whenever you add, rename, or edit a block, unit, or script in scripts/, before any commit, and when the user says a block is missing from the campaign build menu or only shows in sandbox. Mandatory for this repo; never skip it.
---

# Campaign availability

The owner's standing rule: **every Chrono block and the Outpost must be placeable in the campaign the moment the mod loads. No research. Sandbox-only availability is a bug.** This rule was missed once (Outpost, v1.3.0) and must never be missed again.

## Required lines for every content entry

Block (any `extend(<BlockClass>, "<name>", ...)`):
```js
blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked = true;
lib.enableAllEnvironments(blockType);
```

Unit (`extend(UnitType, "<name>", ...)`):
```js
unitType.alwaysUnlocked = true;
```

Every new script file must be added to `optionalScripts` in `scripts/main.js`, or the game never loads it.

## Procedure

1. After editing or creating any `scripts/*.js`, run:
   ```bash
   node tools/check-campaign.js
   ```
   Fix every line it reports. Do not argue with it; the check encodes the owner's rule.
2. Before committing, run it again. The git pre-commit hook in `.githooks/pre-commit` and the Claude Code Stop hook run the same script and refuse to proceed on failure.
3. When a new block is added, also spawn the `campaign-availability-checker` agent for an independent read of the files, and include its first line in your report.
4. In the final message to the user, state explicitly: "Campaign availability check: PASS (N entries)". If it did not pass, the work is not done.

## Why the flags matter

- `alwaysUnlocked = true`: skips the tech tree; without it the block is locked in campaign even though sandbox shows it.
- `buildVisibility = BuildVisibility.shown`: puts it in the build menu; `sandboxOnly` or `hidden` hides it in campaign.
- `lib.enableAllEnvironments(block)`: allows placement on Serpulo, Erekir, and space maps.
