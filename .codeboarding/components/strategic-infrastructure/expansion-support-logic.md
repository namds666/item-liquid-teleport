---
component_id: 4.2
component_name: Expansion Support Logic
---

# Expansion Support Logic

## Component Description

Defines the behavior of auxiliary strategic structures like the Chrono Build Tower. This component manages the stats and logic that allow these structures to assist in the construction of other high-tier buildings, effectively scaling the player's infrastructure capabilities.

---

## Key References:

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

### e:\Projects\item-liquid-teleport\scripts\chrono-build-tower.js (lines 15-21)
```
    setStats() {
        this.super$setStats();
        try {
            this.stats.remove(Stat.range);
        } catch (e) {}
        this.stats.add(Stat.range, "Global");
    },
```

### e:\Projects\item-liquid-teleport\scripts\chrono-build-tower.js (lines 23-23)
```
    drawPlace(x, y, rotation, valid) {}
```


## Source Files:

- `scripts\chrono-core.js`

