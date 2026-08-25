# TODO

A focused improvement list for the Chrono transport mod. These are mostly cleanup, consistency, and maintainability tasks, not a rewrite plan.

## 1. Fix liquid pusher rate mismatch

- [ ] Decide whether `Chrono Liquid Pusher` should push `20/link/5-tick` or `5000/link/5-tick`.
- [ ] If the current cheat-grade value is intended, update `_scope.md` to match the code.
- [ ] If the scope is correct, change `TRANSFER_RATE` in `scripts/chrono-liquid-pusher.js` from `5000` to `20`.
- [ ] Keep README, `_scope.md`, and code consistent.

## 2. Normalize auto flag serialization

Current transport config mixes category auto flags with special options such as Auto Steal. This works, but it is easy to misread and easy to break later.

- [ ] Add named constants in `scripts/lib.js` for category flag indexes:
  - `AUTO_MISC`
  - `AUTO_TURRET`
  - `AUTO_FACTORY`
  - `AUTO_POWER`
  - `AUTO_UNIT`
  - `AUTO_DRILL`
  - `AUTO_LIQUID`
- [ ] Add `AUTO_CATEGORY_COUNT = 7`.
- [ ] Separate category flags from block-specific option flags.
- [ ] Consider adding a new string config prefix such as `ctl2` with this layout:

```text
ctl2;selectedId;categoryFlags;optionFlags;count;dx,dy;dx,dy...
```

- [ ] Keep `ctl1` read support for old saves, schematics, and copy-paste data.
- [ ] Add clear comments for legacy IntSeq formats.

## 3. Make dead link handling consistent

Some blocks cap `deadLinks`; others do not. This should be consistent across all transport blocks.

- [ ] Add a shared dead-link cap constant, for example `MAX_DEAD_LINKS = 50`.
- [ ] Apply the same cap to:
  - `chrono-pusher`
  - `chrono-unloader`
  - `chrono-liquid-pusher`
  - `chrono-liquid-unloader`
- [ ] Move repeated dead link logic into `lib.js` if practical.
- [ ] Verify demolished and rebuilt linked buildings can still resume correctly.

## 4. Batch one-shot auto-connect

Continuous auto-scan already uses batch apply, but one-shot auto-connect still toggles links through `configure()` per building.

- [ ] Update `autoConnect` in `scripts/lib.js` to collect `toAdd` and `toRemove` changes.
- [ ] Apply changes using `makeBatchApply` style logic.
- [ ] Fire only one final `configure(config())` sync after the scan.
- [ ] Check multiplayer behavior after batching.

## 5. Cache block capability checks

`buildConsumesAnyItem`, `buildOutputsAnyItem`, `buildConsumesAnyLiquid`, and `buildOutputsAnyLiquid` can loop through all content types. This was tolerable when auto-link only saw `Groups.build` (updating blocks), but since v1.2.81 both auto-link and the mender scan `team.data().buildings`, which includes every building on the map. The candidate set is much larger and the per-candidate predicate cost matters more.

- [ ] Add a cache for stable block-level capability checks.
- [ ] Key the cache by block name and check type.
- [ ] Keep dynamic build-level overrides uncached:
  - `chronoConsumesItem`
  - `chronoOutputsItem`
  - `chronoConsumesLiquid`
  - `chronoOutputsLiquid`
- [ ] Invalidate or bypass cache if a check depends on live building storage.
- [ ] Benchmark auto-scan on large maps before and after.

## 6. Harden string config parsing

String config parsing already skips invalid coordinate pairs, but count handling can be stricter.

- [ ] Clamp parsed link count to available serialized entries:

```js
count = Math.max(0, Math.min(count, parts.length - 4));
```

- [ ] Ignore or reject malformed configs cleanly.
- [ ] Add comments explaining why string config exists: to avoid Mindustry IntSeq object size limits.

## 7. Extract shared link-state helpers

Transport blocks still duplicate link lifecycle logic. Extracting helpers would reduce drift between item and liquid versions.

- [ ] Consider adding helpers in `scripts/lib.js`:

```js
cleanLinks(build, links, linkValidator)
toggleLink(links, pos)
addDeadLink(links, deadLinks, pos, maxDeadLinks)
resumeDeadLink(build, links, deadLinks, pos, isLiveValid)
drawLinkedTargets(build, links, isLiveValid)
```

- [ ] Refactor one block first as a test case.
- [ ] Only refactor the rest after behavior matches exactly.

## 8. Add edge-case documentation links

The repo already has an `edgeCase/` folder. Surface it better for future debugging.

- [ ] Link `edgeCase/` from README.
- [ ] Add a short note explaining that transport config, schematic transforms, multiplayer sync, and dead-link recovery edge cases live there.
- [ ] Keep `_scope.md` as the detailed implementation reference.

## Suggested priority

1. Fix liquid pusher rate mismatch.
2. Cache block capability checks.
3. Normalize auto flag naming and config comments.
4. Make dead link handling consistent.
5. Batch one-shot auto-connect.
6. Harden string config parsing.
7. Extract shared link-state helpers.
8. Improve edge-case documentation links.
