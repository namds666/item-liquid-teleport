# Chrono Transport — Mod Scope

## Overview
A standalone Mindustry mod providing 4 cheat-grade, 1×1 transport blocks for instant item and liquid distribution across long distances.

## Blocks

### Chrono Unloader (`chrono-unloader`)
- **Category:** Distribution
- **Function:** Pulls a chosen item type from all linked buildings within range and outputs it through adjacent conveyors.
- **Config:** Click block → select item type. Tap buildings within range to link/unlink them (up to 32 links).

### Chrono Pusher (`chrono-pusher`)
- **Category:** Distribution
- **Function:** Accepts items from adjacent conveyors and pushes them into all linked buildings within range.
- **Config:** Tap buildings within range to link/unlink them (up to 32 links). No item filter — pushes everything it holds.

### Chrono Liquid Unloader (`chrono-liquid-unloader`)
- **Category:** Liquid
- **Function:** Pulls a chosen liquid from all linked buildings within range and outputs it through adjacent pipes.
- **Config:** Click block → select liquid type. Tap buildings within range to link/unlink them (up to 32 links).

### Chrono Liquid Pusher (`chrono-liquid-pusher`)
- **Category:** Liquid
- **Function:** Accepts any liquid from adjacent pipes and pushes it into all linked buildings within range.
- **Config:** Tap buildings within range to link/unlink them. No liquid filter — pushes every liquid it holds.

### Chrono Core (`chrono-core`)
- **Category:** Effect
- **Function:** A cheat-grade core block. Extends `CoreBlock`, always unlocked, no research required.
- **Unit:** Produces `gamma` units.
- **Requirements:** 1000 copper + 1000 lead.
- **Size:** 1×1, health 500.

### Chrono Medic (`chrono-medic`)
- **Category:** Unit (flying)
- **Function:** Autonomous flying medic unit. Automatically seeks the nearest injured friendly unit and flies to it, healing at **200 hp/s** (via `RepairFieldAbility`, 20 hp per 6 ticks, 80 px ≈ 5 tile radius). Cannot be player-controlled.
- **AI:** Custom `MedicAI extends FlyingAI` — rescans for nearest damaged ally every 30 ticks, moves to within 40 px of target.
- **Production:** Built in the vanilla **Air Factory** (75 copper + 25 titanium, 20 s).
- **Speed:** 7 (≈ 2× faster than Mono/Flare).
- **Sprite:** `sprites/units/chrono-medic.png` + `chrono-medic-cell.png` (mono sprites, 48×48).
- **Constructor:** Inherits `UnitTypes.mono.constructor` (standard `UnitEntity`).

## Shared Properties
| Property | Value |
|---|---|
| Size | 1×1 |
| Range | 1200 px (150 tiles) |
| Max links | Unlimited (no enforced cap in code) |
| Transfer rate | Items: up to 500 per link per 5-tick batch; Liquid unloader: 500 per link; Liquid pusher: 20 per link |
| Requirements | None (free to place) |
| Research | None |

## File Structure
```
chrono-transport.zip
├── mod.hjson
├── bundles/
│   └── bundle.properties
├── scripts/
│   ├── lib.js                      shared helpers + modName
│   ├── main.js                     entry point, requires all 4 scripts
│   ├── chrono-unloader.js
│   ├── chrono-pusher.js
│   ├── chrono-liquid-unloader.js
│   └── chrono-liquid-pusher.js
└── sprites/
    ├── blocks/distribution/        item blocks (32×32, from abomb4 mod)
    └── blocks/liquid/              liquid blocks (32×32, same sprites recolored at runtime)
```

## Notes
- Liquid blocks have their own separate sprite files (`chrono-liquid-*`); the center dot reuses the vanilla `"unloader-center"` sprite, tinted to the dominant liquid's color at render time.
- All sprites are the original abomb4-super-cheat sprites downscaled from 64×64 to 32×32.
- Item blocks extend `StorageBlock` (uses `StorageBlock.StorageBuild` inner class).
- Liquid blocks extend `Block` (uses `extend(Building, {...})` — no inner class).
