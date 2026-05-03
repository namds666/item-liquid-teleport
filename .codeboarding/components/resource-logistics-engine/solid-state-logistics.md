---
component_id: 2.1
component_name: Solid State Logistics
---

# Solid State Logistics

## Component Description

Manages the discrete movement of item stacks using high-speed injection and extraction logic.

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


## Source Files:

- `scripts\chrono-pusher.js`
- `scripts\chrono-unloader.js`

