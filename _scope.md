# Chrono Transport - Mod Scope

## Overview

A standalone Mindustry cheat mod providing compact Chrono blocks for global item/liquid transport, terrain conversion, item conversion, repair, construction, overdrive, core placement, and unit status control.

## Blocks

### Chrono Unloader (`chrono-unloader`)
- **Category:** Distribution - extends `StorageBlock` / `StorageBuild`
- **Function:** Pulls the selected item type from every linked building (up to 500/link per 5-tick batch), buffers it (100-item capacity), then dumps it through adjacent conveyors every tick.
- **Filter:** Must have an item type selected; does nothing without one.
- **Config:** Tap to toggle individual links. UI: Auto Steal toggle, auto-connect category buttons, and item picker. `clearFn` preserves the selected item id when clearing links. Auto Steal defaults off; when off, sources must be on the same team.

### Chrono Pusher (`chrono-pusher`)
- **Category:** Distribution - extends `StorageBlock` / `StorageBuild`
- **Function:** Receives items from adjacent conveyors (10,000-item capacity), then pushes them into every linked building (up to 500/link per 5-tick batch). Optionally filtered to a single item type via UI picker; without a filter it pushes all held items.
- **Config:** Tap to toggle individual links. UI: auto-connect buttons + optional item filter. Config format is v4 (`[selectedItemId, lc, x0,y0,..., af0..af6]`); older no-filter configs are handled in both `pointConfig` and the IntSeq config handler.

### Chrono Liquid Unloader (`chrono-liquid-unloader`)
- **Category:** Liquid - extends `Block` / `Building`
- **Function:** Pulls the selected liquid from every linked building (up to 500/link per 5-tick batch), buffers it (100-unit capacity), then dumps it through adjacent pipes.
- **Filter:** Must have a liquid type selected; does nothing without one.
- **Config:** Tap to toggle individual links. UI: Auto Steal toggle, auto-connect buttons, and liquid picker. `clearFn` preserves the liquid type id when clearing. Auto Steal defaults off; when off, sources must be on the same team.

### Chrono Liquid Pusher (`chrono-liquid-pusher`)
- **Category:** Liquid - extends `Block` / `Building`
- **Function:** Receives liquid from adjacent pipes (10,000-unit capacity), then pushes it into every linked building (up to 20/link per 5-tick batch). Optionally filtered to a single liquid; without a filter it pushes all held liquids in sequence.
- **Config:** Tap to toggle individual links. UI: auto-connect buttons + optional liquid filter.

### Chrono Liquid Tiler (`chrono-liquid-tiler`)
- **Category:** Crafting - extends `Block` / `Building`
- **Function:** Converts terrain within a configurable radius into the selected liquid floor one tile at a time, progressing counter-clockwise from the block. Supported floors follow the shared boost liquid table: water -> shallow water, slag -> molten slag, oil -> tar, cryofluid -> pooled cryofluid.
- **Rate:** Fixed 0.5s per tile.
- **Cost:** Each converted tile consumes 1 unit of the selected liquid from `chrono-boost-rules`.
- **Config:** Liquid picker + radius buttons (2, 4, 6, 8, 12, 16, 24, 32 blocks). Config serializes as an `IntSeq` of `[selectedLiquidId, radius]`; old configs with an interval value load and discard the interval.
- **Size:** 1x1, health 2147483647.

### Chrono Item Tiler (`chrono-item-tiler`)
- **Category:** Crafting - extends `StorageBlock` / `StorageBuild`
- **Function:** Converts terrain within a configurable radius into the selected item-backed tile one tile at a time, progressing counter-clockwise from the block. Supported ore overlays are copper, lead, scrap, coal, titanium, thorium, beryllium, and tungsten. Supported floor targets include sand, dark sand, spore moss, and metal floor 5.
- **Rate:** Fixed 0.5s per tile.
- **Cost:** Each converted tile consumes 1 item of the selected resource.
- **Config:** Item picker + optional target tile buttons + radius buttons (2, 4, 6, 8, 12, 16, 24, 32 blocks). Config serializes as an `IntSeq` of `[selectedItemId, radius, targetType, targetBlockId]`; old two-entry configs load with the default target for that item.
- **Size:** 1x1, health 2147483647.

### Chrono Item Converter (`chrono-item-converter`)
- **Category:** Crafting - extends `StorageBlock` / `StorageBuild`
- **Function:** Converts a configured input item into a configured output item. Base craft time is 30 ticks before speed selection. Conversion ratio and dynamic power draw are derived from item rarity weights.
- **Rate:** User-selectable speed levels: 1x, 2x, 4x, 8x, 16x, 32x, 64x, 128x. Default is 2x. Power scales above linearly with speed to keep high rates expensive.
- **Config:** Two item picker tables and speed buttons serialize as an `IntSeq` of `[inputItemId, outputItemId, speed]`; old two-entry configs load at the 2x default. Same-item or incomplete recipes are invalid.
- **Behavior:** Accepts only the configured input item, buffers up to 200 items per item type, dumps only the configured output item, and draws no power when the recipe cannot run because input is missing or output storage is full.
- **Size:** 2x2, health 2147483647.

### Chrono Core (`chrono-core`)
- **Category:** Effect
- **Function:** A cheat-grade core block. Extends `CoreBlock`, always unlocked, no research required.
- **Unit:** Produces `gamma` units.
- **Requirements:** 1000 copper + 1000 lead.
- **Size:** 1x1, health 500.

### Chrono Mender (`chrono-mender`)
- **Category:** Effect
- **Function:** Heals every damaged friendly building globally, including non-updating blocks (walls, containers, vaults, sorters, overflow gates, liquid junctions) and sleeping buildings (idle conveyors, conduits). Also heals privileged blocks. No range stat. Uses `lib.teamBuildings` to scan one team per pulse. Pulses fire every RELOAD (10) ticks. Each pulse inspects up to MAX_HEALS_PER_PULSE (512) buildings.
- **Requirements:** None (free to place).
- **Size:** 1x1, health 8000.

### Chrono Repair Point (`chrono-repair-point`)
- **Category:** Unit
- **Function:** Repairs the closest damaged friendly unit globally with custom continuous-beam logic at 50% max health per second.
- **Requirements:** None (free to place).
- **Size:** 1x1, health 40.

### Chrono Build Tower (`chrono-build-tower`)
- **Category:** Effect
- **Function:** Rebuilds structures and assists construction globally using vanilla `BuildTurret` logic.
- **Requirements:** None (free to place).
- **Size:** 1x1, health 610.

### Chrono Booster (`chrono-booster`)
- **Category:** Effect
- **Function:** 1x1 overdrive dome variant. Copies Overdrive Dome cost, power draw, base range, base speed boost, use time, mandatory phase fabric + silicon operation, ambient sound volume, and sprite, with health fixed to the vanilla dome value.
- **Base stats:** 25-block range, +150% speed, 10 power units/tick, consumes 1 phase fabric + 1 silicon every 10 seconds.
- **Shared boosts:** Every accepted booster item or liquid consumes 1 unit per 2 seconds while active. Boosters add flat radius and apply tiered radius multipliers from x1.01 to x1.25. Radius uses `final = (base + active flat range) * active range multipliers`.
- **Requirements:** Same as Overdrive Dome: 200 lead, 130 titanium, 130 silicon, 80 plastanium, 120 surge alloy.
- **Size:** 1x1, health 485.

### Chrono Buffer (`chrono-buffer`)
- **Category:** Unit
- **Function:** Applies allied unit buffs in range. Phase fabric and silicon provide Overdrive and Overclock while present; consumed item/liquid boosters temporarily unlock additional vanilla and custom statuses such as Guardian, Fast, Chrono Conductive, Chrono Dense, Chrono Focus, Chrono Precision, and higher-tier resource buffs.
- **Sprites:** Cloned from the Chrono Booster base/top PNG and PSD assets, then loaded as `chrono-buffer` and `chrono-buffer-top` so the art can diverge later.
- **Base stats:** 25-block range, +150% status duration, 10 power units/tick, consumes 1 phase fabric + 1 silicon every 10 seconds.
- **Shared boosts:** Uses the same item/liquid boost table and radius formula as Chrono Booster. Extra boosters increase radius, status duration, and the set of active buffs.
- **Requirements:** Same as Chrono Booster: 200 lead, 130 titanium, 130 silicon, 80 plastanium, 120 surge alloy.
- **Size:** 1x1, health 485.

### Chrono Debuffer (`chrono-debuffer`)
- **Category:** Unit
- **Function:** Applies Burning, Electrified, Spore Slowed, Tarred, Shocked, Blasted, Corroded, Freezing, Wet, Melting, and Sapped to enemy units in range.
- **Sprites:** Cloned from the Chrono Booster base/top PNG and PSD assets, then loaded as `chrono-debuffer` and `chrono-debuffer-top` so the art can diverge later.
- **Base stats:** 25-block range, +150% status duration, 10 power units/tick, consumes 1 phase fabric + 1 silicon every 10 seconds.
- **Shared boosts:** Uses the same item/liquid boost table and radius formula as Chrono Booster. Extra boosters increase radius and status duration.
- **Requirements:** Same as Chrono Booster: 200 lead, 130 titanium, 130 silicon, 80 plastanium, 120 surge alloy.
- **Size:** 1x1, health 485.

## Shared lib.js Infrastructure

All four transport blocks share the same plumbing from `lib.js`:

### Link management
- Links are stored as a `Seq<Integer>` of packed tile positions (`Point2.pack`).
- `Integer` config type: toggles one link (add if absent, remove if present) - fires on every tap in configure mode.
- `IntSeq` config type: full replace - rebuilds the link list from a serialized snapshot (used on load and auto-scan end).
- **Dead links:** when `lvt()` fails during `updateTile`, the position is removed from `links` and added to `deadLinks`. On `BlockBuildEndEvent` (a building is placed), every transport block checks `tryResumeDeadLink` to re-add it. This handles demolish-and-rebuild without manual relinking.

### Auto-scan (`makeScanJob`)
Returns a stateful scan job called from `updateTile` every tick. Flow:
1. Waits 60 ticks between scans (resets if `autoFlags` change while any flag is on).
2. On trigger: snapshots all buildings via `lib.eachBuilding` into an array, sets `idx = 0`.
3. Each tick, processes `chunkSize` (50) buildings from the snapshot - checks `lvt` and category flags, accumulates `toAdd`/`toRemove` lists.
4. At scan end: calls `batchApply(toAdd, toRemove)` to flush the final batch, then fires one `configure(config())` sync to propagate to other clients.
5. Chrono blocks themselves are excluded via `CHRONO_NAMES` check; `ConstructBuild`s (buildings under construction) are excluded via `getSimpleName() === "ConstructBuild"` - their `.block` resolves to the real block so they pass category checks, but their `.liquids` is null, causing crashes.
6. Because `lib.eachBuilding` iterates all buildings (not just `update=true` ones), item auto-link now reaches containers, vaults, sorters, and overflow gates. Liquid auto-link keeps its exclusions: containers, junctions, and pipes are excluded from the liquid path.

### Config serialization
Small link snapshots serialize as the legacy `IntSeq` format. Because Mindustry save plan IO reads `IntSeq` configs with a 200-element limit, this path is capped at 95 links for seven category flags (`selected + count + 95*2 offsets + 7 flags = 199`) and 95 links for unloaders with the extra Auto Steal flag.

Large link snapshots serialize as a compact `ctl1` string (`selected;flags;count;dx,dy...`) so sector saves, rebuild plans, copy/paste, and schematic transforms do not hit `TypeIO.writeObject`'s `IntSeq` array limit.

### Batch apply (`makeBatchApply`)
Mutates the `links` Seq directly (add/remove) without going through `configure()` per-entry. Deferred to scan end so auto-scan can apply a single full config sync after the batch.

### Auto-connect buttons (`addAutoConnectButtons`)
Renders 7 checkbox+button pairs for categories: Misc (effect), Turret, Factory (crafting), Power, Unit, Drill (production), Liquid. Checkboxes toggle `autoFlags[i]` for continuous auto-scan; buttons trigger a one-shot `autoConnect` scan for their category.

## Shared Properties

| Property | Value |
|---|---|
| Size | Mostly 1x1; Chrono Item Converter is 2x2 |
| Range | Global for transport/repair/build blocks; 25-block base range for booster/buffer/debuffer |
| Max links (runtime) | Unlimited |
| Max links (serialized) | Unlimited for large string configs; legacy `IntSeq` configs are capped at 96 links |
| Transfer rate | Items: 500/link/5-tick; liquid unloader: 500/link/5-tick; liquid pusher: 20/link/5-tick |
| Research | None |

## File Structure

```text
item-liquid-teleport/
+-- mod.hjson
+-- bundles/
|   +-- bundle.properties
|   +-- bundle_zh_CN.properties
+-- scripts/
|   +-- lib.js                      shared link mgmt, scan job, batch apply, UI buttons
|   +-- main.js                     entry point
|   +-- chrono-unloader.js
|   +-- chrono-pusher.js
|   +-- chrono-liquid-unloader.js
|   +-- chrono-liquid-pusher.js
|   +-- chrono-liquid-tiler.js
|   +-- chrono-item-tiler.js
|   +-- chrono-item-converter.js
|   +-- chrono-core.js
|   +-- chrono-mender.js
|   +-- chrono-repair-point.js
|   +-- chrono-build-tower.js
|   +-- chrono-booster.js
|   +-- chrono-buffer.js
|   +-- chrono-debuffer.js
+-- edgeCase/                       known edge-case notes
+-- sprites/
    +-- blocks/distribution/        item transport blocks
    +-- blocks/crafting/            item converter and item tiler sprites
    +-- blocks/liquid/              liquid transport blocks
    +-- blocks/defense/             mender/build tower sprites
    +-- blocks/effect/              core/booster/buffer/debuffer sprites
    +-- blocks/units/               repair point sprites
    +-- statuses/                   custom status icons
```

## Notes

- Item transport/converter/item-tiler blocks extend `StorageBlock` (JavaAdapter over `StorageBlock.StorageBuild`); liquid blocks extend `Block` (plain `extend(Building, ...)`).
- The center dot on transport and tiler blocks reuses the vanilla `"unloader-center"` sprite, tinted to the selected filter color (or dominant held liquid/item color) at render time.
- Config serialization uses relative tile offsets (delta from block's own tile) so configs survive copy-paste and schematic placement (`pointConfig` transforms them back).
- All building iteration in this mod must use `lib.teamBuildings(team)` (one team) or `lib.eachBuilding(fn)` (all teams). Do not use the vanilla build group directly — it holds only buildings whose block sets `update = true` and that have not called `sleep()`.
- Save/load versioned via `version()`: unloader v6, pusher v4, liquid-unloader v5, liquid-pusher v6, liquid-tiler v2, item-tiler v2, item-converter v2, chrono-booster v1, chrono-buffer v1, chrono-debuffer v1. Older revisions are handled in `read()`.
