# item-liquid-teleport

Mindustry JS mod. Scripts in `scripts/`, sprites in `sprites/`, strings in `bundles/`.

## Non-negotiable: campaign availability

Every block and unit this mod defines must be usable in the normal campaign with no research, on every planet. When you add or edit anything in `scripts/`:

- Blocks: `alwaysUnlocked = true`, `buildVisibility = BuildVisibility.shown`, `lib.enableAllEnvironments(block)`.
- Units: `alwaysUnlocked = true`.
- Register the script in `scripts/main.js`.
- Run `node tools/check-campaign.js` and report its result in your final message. Use the `campaign-availability` skill and the `campaign-availability-checker` agent for new content.

Sandbox availability is not evidence. The pre-commit hook and the Claude Code Stop hook block on failure.

## Non-negotiable: localization in all 35 languages

Every user-facing string (block/unit/status names and descriptions, `outpost.*` UI strings, mod displayName/subtitle/description) must be translated in every language Mindustry ships: `bundles/bundle.properties` (English) plus 34 `bundles/bundle_<locale>.properties`. When you add or edit anything in `scripts/`, `bundles/`, or `mod.hjson`:

- New content: add `.name` and `.description` keys to `bundle.properties` and to all 34 locale files.
- Version bump: retranslate `item-liquid-teleport.subtitle` and `.description` in all 34 locale files.
- Run `node tools/check-localize.js` and report its result in your final message. Use the `localization` skill and the `localization-checker` agent.

The pre-commit hook and the Claude Code Stop hook block on failure.

## Non-negotiable: version bump on every push

Every push must raise `version` in `mod.hjson` (bump the last digit, e.g. 1.3.2 -> 1.3.3), update its `subtitle`, and mirror subtitle/description into all 34 `bundles/bundle_<locale>.properties`. The pre-push hook refuses a push whose version is not above the remote branch.

## Setup after clone

```bash
git config core.hooksPath .githooks
```

## Testing

`tools/harness/run.sh` runs the headless server suite (see `tools/harness/README.md`).
