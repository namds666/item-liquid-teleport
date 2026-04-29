# Chrono Transport — Mod Scope

## Overview
A standalone Mindustry mod providing 4 cheat-grade, 1×1 transport blocks for instant global item and liquid distribution.

## Blocks

### Chrono Unloader (`chrono-unloader`)
- **Category:** Distribution — extends `StorageBlock` / `StorageBuild`
- **Function:** Pulls the selected item type from every linked building (up to 500/link per 5-tick batch), buffers it (100-item capacity), then dumps it through adjacent conveyors every tick.
- **Filter:** Must have an item type selected; does nothing without one.
- **Config:** Tap to toggle individual links. UI: auto-connect buttons (6 categories) + item picker. `clearFn` preserves the selected item id when clearing links.

### Chrono Pusher (`chrono-pusher`)
- **Category:** Distribution — extends `StorageBlock` / `StorageBuild`
- **Function:** Receives items from adjacent conveyors (10 000-item capacity), then pushes them into every linked building (up to 500/link per 5-tick batch). Optionally filtered to a single item type via UI picker; without a filter it pushes all held items.
- **Config:** Tap to toggle individual links. UI: auto-connect buttons + optional item filter. Config format is v3 (even-length IntSeq: `[selectedItemId, lc, x0,y0,…, af0..af5]`); older odd-length saves are handled in both `pointConfig` and the IntSeq config handler.

### Chrono Liquid Unloader (`chrono-liquid-unloader`)
- **Category:** Liquid — extends `Block` / `Building`
- **Function:** Pulls the selected liquid from every linked building (up to 500/link per 5-tick batch), buffers it (100-unit capacity), then dumps it through adjacent pipes.
- **Filter:** Must have a liquid type selected; does nothing without one.
- **Config:** Tap to toggle individual links. UI: auto-connect buttons + liquid picker. `clearFn` preserves the liquid type id when clearing.

### Chrono Liquid Pusher (`chrono-liquid-pusher`)
- **Category:** Liquid — extends `Block` / `Building`
- **Function:** Receives liquid from adjacent pipes (10 000-unit capacity), then pushes it into every linked building (up to 20/link per 5-tick batch). Optionally filtered to a single liquid; without a filter it pushes all held liquids in sequence.
- **Config:** Tap to toggle individual links. UI: auto-connect buttons + optional liquid filter.

### Chrono Core (`chrono-core`)
- **Category:** Effect
- **Function:** A cheat-grade core block. Extends `CoreBlock`, always unlocked, no research required.
- **Unit:** Produces `gamma` units.
- **Requirements:** 1000 copper + 1000 lead.
- **Size:** 1×1, health 500.

### Chrono Mender (`chrono-mender`)
- **Category:** Effect
- **Function:** Heals every damaged friendly building globally twice per second.
- **Requirements:** None (free to place).
- **Size:** 1×1, health 8000.

### Chrono Repair Point (`chrono-repair-point`)
- **Category:** Unit
- **Function:** Repairs the closest damaged friendly unit globally with custom continuous-beam logic at 50% max health per second.
- **Requirements:** None (free to place).
- **Size:** 1×1, health 40.

### Chrono Build Tower (`chrono-build-tower`)
- **Category:** Effect
- **Function:** Rebuilds structures and assists construction globally using vanilla `BuildTurret` logic.
- **Requirements:** None (free to place).
- **Size:** 1×1, health 610.

### Chrono Booster (`chrono-booster`)
- **Category:** Effect
- **Function:** 1×1 overdrive dome variant. Copies Overdrive Dome cost, power draw, base range, base speed boost, use time, mandatory phase fabric + silicon operation, ambient sound volume, and sprite, with health fixed to the vanilla dome value.
- **Base stats:** 25-block range, +150% speed, 10 power units/tick, consumes 1 phase fabric + 1 silicon every 5 seconds.
- **Additive boosts:** Balanced by resource rarity. Scrap/sand/water start at 50 item/sec or 120 liquid/sec for +2.5 blocks and +20% speed; blast compound ends at 1/sec for +25 blocks and +250% speed. Liquids use 60-120/sec.
- **Requirements:** Same as Overdrive Dome: 200 lead, 130 titanium, 130 silicon, 80 plastanium, 120 surge alloy.
- **Size:** 1×1, health 485.

## Shared lib.js Infrastructure

All four transport blocks share the same plumbing from `lib.js`:

### Link management
- Links are stored as a `Seq<Integer>` of packed tile positions (`Point2.pack`).
- `Integer` config type: toggles one link (add if absent, remove if present) — fires on every tap in configure mode.
- `IntSeq` config type: full replace — rebuilds the link list from a serialized snapshot (used on load and auto-scan end).
- **Dead links:** when `lvt()` fails during `updateTile`, the position is removed from `links` and added to `deadLinks`. On `BlockBuildEndEvent` (a building is placed), every transport block checks `tryResumeDeadLink` to re-add it. This handles demolish-and-rebuild without manual relinking.

### Auto-scan (`makeScanJob`)
Returns a stateful scan job called from `updateTile` every tick. Flow:
1. Waits 60 ticks between scans (resets if `autoFlags` change while any flag is on).
2. On trigger: snapshots `Groups.build` into an array, sets `idx = 0`.
3. Each tick, processes `chunkSize` (50) buildings from the snapshot — checks `lvt` and category flags, accumulates `toAdd`/`toRemove` lists.
4. At scan end: calls `batchApply(toAdd, toRemove)` to flush the final batch, then fires one `configure(config())` sync to propagate to other clients.
5. Chrono blocks themselves are excluded via `CHRONO_NAMES` check; `ConstructBuild`s (buildings under construction) are excluded via `getSimpleName() === "ConstructBuild"` — their `.block` resolves to the real block so they pass category checks, but their `.liquids` is null, causing crashes.

### Config serialization
Small link snapshots serialize as the legacy `IntSeq` format. Because Mindustry save plan IO reads `IntSeq` configs with a 200-element limit, this path is capped at 96 links (`selected + count + 96*2 offsets + 6 flags = 200`).

Large link snapshots serialize as a compact `ctl1` string (`selected;flags;count;dx,dy...`) so sector saves, rebuild plans, copy/paste, and schematic transforms do not hit `TypeIO.writeObject`'s `IntSeq` array limit.

### Batch apply (`makeBatchApply`)
Mutates the `links` Seq directly (add/remove) without going through `configure()` per-entry. Deferred to scan end so auto-scan can apply a single full config sync after the batch.

### Auto-connect buttons (`addAutoConnectButtons`)
Renders 6 checkbox+button pairs for categories: Misc (effect), Turret, Factory (crafting), Power, Unit, Drill (production). Checkboxes toggle `autoFlags[i]` for continuous auto-scan; buttons trigger a one-shot `autoConnect` scan for their category.

## Shared Properties
| Property | Value |
|---|---|
| Size | 1×1 |
| Range | Global (no distance limit) |
| Max links (runtime) | Unlimited |
| Max links (serialized) | Unlimited for large string configs; legacy `IntSeq` configs are capped at 96 links |
| Transfer rate | Items: 500/link/5-tick; Liquid unloader: 500/link/5-tick; Liquid pusher: 20/link/5-tick |
| Requirements | None (free to place) |
| Research | None |

## File Structure
```
item-liquid-teleport/
├── mod.hjson
├── bundles/
│   └── bundle.properties
├── scripts/
│   ├── lib.js                      shared link mgmt, scan job, batch apply, UI buttons
│   ├── main.js                     entry point
│   ├── chrono-unloader.js
│   ├── chrono-pusher.js
│   ├── chrono-liquid-unloader.js
│   ├── chrono-liquid-pusher.js
│   ├── chrono-core.js
│   ├── chrono-mender.js
│   ├── chrono-booster.js
│   └── chrono-build-tower.js
├── edgeCase/                   known edge-case notes
└── sprites/
    ├── blocks/distribution/        item blocks (32×32)
    └── blocks/liquid/              liquid blocks (32×32, center dot tinted at render time)
```

## Notes
- Item blocks extend `StorageBlock` (JavaAdapter over `StorageBlock.StorageBuild`); liquid blocks extend `Block` (plain `extend(Building, ...)`).
- The center dot on all four blocks reuses the vanilla `"unloader-center"` sprite, tinted to the selected filter color (or dominant held liquid/item color) at render time.
- Config serialization uses relative tile offsets (delta from block's own tile) so configs survive copy-paste and schematic placement (`pointConfig` transforms them back).
- Save/load versioned via `version()`: unloader v4, pusher v3, liquid-unloader v3, liquid-pusher v5, chrono-booster v1. Older revisions handled in `read()`.
