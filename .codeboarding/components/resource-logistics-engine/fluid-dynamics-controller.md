---
component_id: 2.2
component_name: Fluid Dynamics Controller
---

# Fluid Dynamics Controller

## Component Description

Handles continuous flow logistics for liquids with high-volume transfer capabilities.

---

## Key References:

### e:\Projects\item-liquid-teleport\scripts\chrono-liquid-unloader.js (lines 14-47)
```
const blockType = extend(Block, "chrono-liquid-unloader", {
    load() {
        this.super$load();
        this.region  = lib.loadRegion("chrono-liquid-unloader");
        topRegion    = lib.loadRegion("chrono-liquid-unloader-top");
        bottomRegion = lib.loadRegion("chrono-liquid-unloader-bottom");
        rotatorRegion = lib.loadRegion("chrono-liquid-unloader-rotator");
    },
    setBars() {
        this.super$setBars();
        this.barMap.put("liquid", lib.func(e => new Bar(
            prov(() => e.liquidType == null ? Core.bundle.get("bar.liquid") : e.liquidType.localizedName),
            prov(() => e.liquidType == null ? Pal.gray : e.liquidType.barColor),
            floatp(() => e.liquidType == null ? 0 : e.liquids.get(e.liquidType) / e.block.liquidCapacity)
        )));
    },
    pointConfig(config, transformer) {
        if (lib.isStringConfig(config)) return lib.pointTransportConfig(config, transformer);
        if (!IntSeq.__javaObject__.isInstance(config)) return config;
        if (config.size < 2) return config;
        let lc = Math.max(0, Math.min(config.get(1), Math.floor((config.size - 2) / 2)));
        let ns = new IntSeq(config.size);
        ns.add(config.get(0)); ns.add(lc);
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


## Source Files:

- `scripts\chrono-liquid-pusher.js`
- `scripts\chrono-liquid-unloader.js`

