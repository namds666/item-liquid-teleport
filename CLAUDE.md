# item-liquid-teleport

Mindustry JS mod. Scripts in `scripts/`, sprites in `sprites/`, strings in `bundles/`.

## Non-negotiable: campaign availability

Every block and unit this mod defines must be usable in the normal campaign with no research, on every planet. When you add or edit anything in `scripts/`:

- Blocks: `alwaysUnlocked = true`, `buildVisibility = BuildVisibility.shown`, `lib.enableAllEnvironments(block)`.
- Units: `alwaysUnlocked = true`.
- Register the script in `scripts/main.js`.
- Run `node tools/check-campaign.js` and report its result in your final message. Use the `campaign-availability` skill and the `campaign-availability-checker` agent for new content.

Sandbox availability is not evidence. The pre-commit hook and the Claude Code Stop hook block on failure.

## Setup after clone

```bash
git config core.hooksPath .githooks
```

## Testing

`tools/harness/run.sh` runs the headless server suite (see `tools/harness/README.md`).
