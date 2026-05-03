---
component_id: 3
component_name: Environmental Support Systems
---

# Environmental Support Systems

## Component Description

Handles Area-of-Effect (AoE) interactions, including status boosters, debuffers, and health maintenance. This component scans the environment to apply modifications to nearby friendly or enemy units and structures.

---

## Key References:

### e:\Projects\item-liquid-teleport\scripts\chrono-mender.js (lines 41-52)
```
const chronoMender = extend(Block, "chrono-mender", {
    load() {
        this.super$load();
        if (Vars.headless) return;
        this.topRegion = lib.loadRegion("chrono-mender-top");
    },

    setStats() {
        this.super$setStats();
        this.stats.add(Stat.repairTime, (100 / HEAL_PERCENT * RELOAD / 60) | 0, StatUnit.seconds);
    }
});
```

### e:\Projects\item-liquid-teleport\scripts\chrono-buffer.js (lines 110-116)
```
    setStats() {
        this.super$setStats();
        try { this.stats.remove(Stat.booster); } catch (e) {}
        this.stats.add(Stat.abilities, "Applies Overdrive, Overclock, Guardian, and Fast to allied units.");
        for (let i = 0; i < itemBoosters.length; i++) addItemBoosterStat(this.stats, itemBoosters[i]);
        for (let i = 0; i < liquidBoosters.length; i++) addLiquidBoosterStat(this.stats, liquidBoosters[i]);
    },
```


## Source Files:

- `scripts\chrono-booster.js`
- `scripts\chrono-buffer.js`
- `scripts\chrono-debuffer.js`
- `scripts\chrono-mender.js`
- `scripts\chrono-repair-point.js`

