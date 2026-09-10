Stage all changes and create a commit on the current branch.

Steps:
1. Run `git status` and `git diff` to review what has changed
2. Run `git log -5 --oneline` to match the existing commit message style
3. Write a concise commit message focused on the "why", following the repo's style
4. Upgrade version in @mod.hjson, update desc in "subtitle" but super short and concise. Only bump the last digit, eg. 1.2.9 -> 1.2.10
5. Mirror the new mod.hjson `subtitle` and `description` into every `bundles/bundle_<locale>.properties` (34 files) as `item-liquid-teleport.subtitle` / `item-liquid-teleport.description`, translated to that language. Keep the `v<version>:` prefix in the subtitle. English lives only in mod.hjson (no `item-liquid-teleport.*` keys in bundle.properties). Use the `localization` skill.
6. Run `node tools/check-localize.js`. If it fails, add or fix every reported key; the pre-commit hook refuses the commit otherwise.
7. Run `node tools/check-campaign.js`. If it fails, fix every reported script line first; the pre-commit hook refuses the commit otherwise.
8. No commit or stage. Stop there.
