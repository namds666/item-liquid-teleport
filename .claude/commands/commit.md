Stage all changes and create a commit on the current branch.

Steps:
1. Run `git status` and `git diff` to review what has changed
2. Run `git log -5 --oneline` to match the existing commit message style
3. Write a concise commit message focused on the "why", following the repo's style
4. Upgrade version in @mod.hjson, update desc in "subtitle" but super short and concise. Only bump the last digit, eg. 1.2.9 -> 1.2.10
5. Mirror the new mod.hjson `subtitle` and `description` into `bundles/bundle_zh_CN.properties` as `item-liquid-teleport.subtitle` / `item-liquid-teleport.description`, translated to Simplified Chinese. Keep the `v<version>:` prefix in the subtitle. Do the same for any other `bundles/bundle_*.properties` that defines these keys. English lives only in mod.hjson (no `item-liquid-teleport.*` keys in bundle.properties).
6. Check `bundles/bundle_zh_CN.properties` has a translation for every `block.*`, `status.*`, etc. key in `bundles/bundle.properties`; add missing ones.
7. No commit or stage. Stop there.
