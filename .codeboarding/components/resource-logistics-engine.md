---
component_id: 2
component_name: Resource Logistics Engine
---

# Resource Logistics Engine

## Component Description

Manages the high-speed movement and unloading of both physical items and liquids. It encapsulates the logic for Chrono pushers and unloaders, ensuring efficient resource throughput between blocks.

---

## Key References:

### e:\Projects\item-liquid-teleport\scripts\chrono-unloader.js (lines 14-44)
```
const blockType = extend(StorageBlock, "chrono-unloader", {
    load() {
        this.super$load();
        topRegion     = lib.loadRegion("chrono-unloader-top");
        bottomRegion  = lib.loadRegion("chrono-unloader-bottom");
        rotatorRegion = lib.loadRegion("chrono-unloader-rotator");
    },
    init() { this.super$init(); this.acceptsItems = false; },
    setBars() {
        this.super$setBars();
        this.barMap.put("capacity", lib.func(e => new Bar(
            prov(() => Core.bundle.format("bar.capacity", UI.formatAmount(e.block.itemCapacity))),
            prov(() => Pal.items),
            floatp(() => e.items.total() / (e.block.itemCapacity * Vars.content.items().count(boolf(i => i.unlockedNow()))))
        )));
    },
    outputsItems() { return true; },
    pointConfig(config, transformer) {
        if (lib.isStringConfig(config)) return lib.pointTransportConfig(config, transformer);
        if (!IntSeq.__javaObject__.isInstance(config)) return config;
        let ns = new IntSeq(config.size);
        ns.add(config.get(0)); ns.add(config.get(1));
        let lx = null;
        for (let i = 2; i < config.size; i++) {
            let n = config.get(i);
            if (lx == null) { lx = n; }
            else { let p = new Point2(lx*2-1, n*2-1); transformer.get(p); ns.add((p.x+1)/2); ns.add((p.y+1)/2); lx = null; }
        }
        return ns;
    },
});
```

### e:\Projects\item-liquid-teleport\scripts\chrono-liquid-pusher.js (lines 14-56)
```
const blockType = extend(Block, "chrono-liquid-pusher", {
    load() {
        this.super$load();
        this.region   = lib.loadRegion("chrono-liquid-pusher");
        topRegion     = lib.loadRegion("chrono-liquid-pusher-top");
        bottomRegion  = lib.loadRegion("chrono-liquid-pusher-bottom");
        rotatorRegion = lib.loadRegion("chrono-liquid-pusher-rotator");
    },
    setBars() {
        this.super$setBars();
        this.barMap.put("liquid", lib.func(e => {
            let dominant = null, domAmt = 0;
            for (let li = 0; li < Vars.content.liquids().size; li++) {
                let liq = Vars.content.liquids().get(li), amt = e.liquids.get(liq);
                if (amt > domAmt) { domAmt = amt; dominant = liq; }
            }
            return new Bar(
                prov(() => dominant == null ? Core.bundle.get("bar.liquid") : dominant.localizedName),
                prov(() => dominant == null ? Pal.gray : (dominant.barColor != null ? dominant.barColor : dominant.color != null ? dominant.color : Pal.gray)),
                floatp(() => domAmt / e.block.liquidCapacity)
            );
        }));
    },
    pointConfig(config, transformer) {
        if (lib.isStringConfig(config)) return lib.pointTransportConfig(config, transformer);
        if (!IntSeq.__javaObject__.isInstance(config)) return config;
        if (config.size < 2) return config;
        let selectedId = config.get(0);
        let lc = Math.max(0, Math.min(config.get(1), Math.floor((config.size - 2) / 2)));
        let ns = new IntSeq(config.size);
        ns.add(selectedId);
        ns.add(lc);
        for (let i = 0; i < lc; i++) {
            let base = 2 + i * 2;
            let p = new Point2(config.get(base)*2-1, config.get(base+1)*2-1);
            transformer.get(p);
            ns.add((p.x+1)/2);
            ns.add((p.y+1)/2);
        }
        for (let i = 2 + lc * 2; i < config.size; i++) ns.add(config.get(i));
        return ns;
    },
});
```

### e:\Projects\item-liquid-teleport\scripts\chrono-pusher.js (lines 14-52)
```
const blockType = extend(StorageBlock, "chrono-pusher", {
    load() {
        this.super$load();
        topRegion     = lib.loadRegion("chrono-pusher-top");
        bottomRegion  = lib.loadRegion("chrono-pusher-bottom");
        rotatorRegion = lib.loadRegion("chrono-pusher-rotator");
    },
    setBars() {
        this.super$setBars();
        this.barMap.put("capacity", lib.func(e => new Bar(
            prov(() => Core.bundle.format("bar.capacity", UI.formatAmount(e.block.itemCapacity))),
            prov(() => Pal.items),
            floatp(() => e.items.total() / (e.block.itemCapacity * Vars.content.items().count(boolf(i => i.unlockedNow()))))
        )));
    },
    outputsItems() { return false; },
    pointConfig(config, transformer) {
        if (lib.isStringConfig(config)) return lib.pointTransportConfig(config, transformer);
        if (!IntSeq.__javaObject__.isInstance(config)) return config;
        if (config.size < 1) return config;
        // v3 format is even-sized (2 + lc*2 + 6); all older formats are odd-sized (1 + lc*2 + autoFlagCount)
        let isV3 = (config.size % 2 == 0);
        let selectedId = isV3 ? config.get(0) : -1;
        let lc         = isV3 ? config.get(1) : config.get(0);
        let linkStart  = isV3 ? 2 : 1;
        let afterLinks = linkStart + lc * 2;
        let ns = new IntSeq(config.size + (isV3 ? 0 : 1));
        ns.add(selectedId); ns.add(lc);
        for (let i = 0; i < lc; i++) {
            let base = linkStart + i*2;
            if (base + 1 >= config.size) break;
            let p = new Point2(config.get(base)*2-1, config.get(base+1)*2-1);
            transformer.get(p);
            ns.add((p.x+1)/2); ns.add((p.y+1)/2);
        }
        for (let i = afterLinks; i < config.size; i++) ns.add(config.get(i));
        return ns;
    },
});
```


## Source Files:

- `scripts\chrono-liquid-pusher.js`
- `scripts\chrono-liquid-unloader.js`
- `scripts\chrono-pusher.js`
- `scripts\chrono-unloader.js`

