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
- **Function:** Accepts a chosen liquid from adjacent pipes and pushes it into all linked buildings within range.
- **Config:** Click block → select liquid type. Tap buildings within range to link/unlink them (up to 32 links).

## Shared Properties
| Property | Value |
|---|---|
| Size | 1×1 |
| Range | 1200 px (150 tiles) |
| Max links | 32 |
| Transfer rate | 20 units per 5-tick batch |
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
- Liquid blocks reuse the unloader/pusher sprites; the center dot is tinted to the selected liquid's color at render time.
- All sprites are the original abomb4-super-cheat sprites downscaled from 64×64 to 32×32.
- Item blocks extend `StorageBlock` (uses `StorageBlock.StorageBuild` inner class).
- Liquid blocks extend `Block` (uses `extend(Building, {...})` — no inner class).
