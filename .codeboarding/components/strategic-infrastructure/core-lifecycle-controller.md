---
component_id: 4.1
component_name: Core Lifecycle Controller
---

# Core Lifecycle Controller

## Component Description

Manages the high-priority initialization and placement validation for the mod's primary Chrono Core. It ensures the core can only be placed in valid locations and handles the transition from a ghost-blueprint to a physical game entity.

---

## Key References:

### e:\Projects\item-liquid-teleport\scripts\chrono-core.js (lines 5-8)
```
    load() {
        this.super$load();
        this.region = lib.loadRegion("chrono-core");
    },
```

### e:\Projects\item-liquid-teleport\scripts\chrono-core.js (lines 11-11)
```
    beforePlaceBegan(tile, previous) {},
```

### e:\Projects\item-liquid-teleport\scripts\chrono-core.js (lines 9-9)
```
    canPlaceOn(tile, team) { return true; },
```


## Source Files:

- `scripts\chrono-build-tower.js`
- `scripts\chrono-core.js`

