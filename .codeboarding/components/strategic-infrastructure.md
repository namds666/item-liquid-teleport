---
component_id: 4
component_name: Strategic Infrastructure
---

# Strategic Infrastructure

## Component Description

Manages the primary entry points of the mod, including custom cores and construction towers. It defines the placement rules and initialization logic that allow the mod's content to exist within the game world.

---

## Key References:

### e:\Projects\item-liquid-teleport\scripts\chrono-core.js (lines 11-11)
```
    beforePlaceBegan(tile, previous) {},
```

### e:\Projects\item-liquid-teleport\scripts\chrono-build-tower.js (lines 7-13)
```
    load() {
        this.super$load();
        if (Vars.headless) return;
        this.region = lib.loadRegion("chrono-build-tower");
        this.baseRegion = lib.loadRegion("chrono-build-tower-base");
        this.glowRegion = lib.loadRegion("chrono-build-tower-glow");
    },
```


## Source Files:

- `scripts\chrono-build-tower.js`
- `scripts\chrono-core.js`

