---
component_id: 1
component_name: Core Orchestration & Utility
---

# Core Orchestration & Utility

## Component Description

The foundational layer that provides the glue for the mod. It handles UI injection, batch processing of logic, and configuration management, enabling all other components to interact with the Mindustry engine.

---

## Key References:

### e:\Projects\item-liquid-teleport\scripts\lib.js (lines 195-215)
```
exports.addAutoConnectButtons = (table, the, getLinks, lvt, clearFn, autoFlags) => {
    table.center();
    const bw = 150; // Button width
    const cw = 40;  // Checkbox width
    const bh = 40;  // Button and Checkbox height 
    const sp = 20;  // Horizontal spacing between button groups

    makeCheck(table, autoFlags, 0);
    table.button("Misc", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.effect); })).size(bw, bh).padRight(sp);
    makeCheck(table, autoFlags, 1);
    table.button("Turret", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.turret); })).size(bw, bh).row();
    makeCheck(table, autoFlags, 2);
    table.button("Factory", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.crafting); })).size(bw, bh).padRight(sp);
    makeCheck(table, autoFlags, 3);
    table.button("Power", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.power); })).size(bw, bh).row();
    makeCheck(table, autoFlags, 4);
    table.button("Unit", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.units); })).size(bw, bh).padRight(sp);
    makeCheck(table, autoFlags, 5);
    table.button("Drill", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.production); })).size(bw, bh).row();
    table.button("Clear All Links", run(() => { the.configure(clearFn()); })).size(bw * 2 + cw * 2 + sp, bh).colspan(4).padTop(4).row();
};
```

### e:\Projects\item-liquid-teleport\scripts\lib.js (lines 182-187)
```
exports.makeBatchApply = (getLinks) => (toAdd, toRemove) => {
    let links = getLinks();
    for (let pos of toAdd) links.add(exports.int(pos));
    for (let pos of toRemove) { let int = exports.int(pos); links.remove(boolf(i => i == int)); }
    // configure sync is deferred to scan end in makeScanJob to avoid mid-scan cap truncation
};
```

### e:\Projects\item-liquid-teleport\scripts\lib.js (lines 14-37)
```
exports.transportConfig = (selectedId, links, tileX, tileY, autoFlags) => {
    let selected = selectedId == null ? -1 : selectedId;
    if (links.size <= MAX_INTSEQ_CONFIG_LINKS) {
        let seq = new IntSeq(links.size*2 + 8);
        seq.add(selected);
        seq.add(links.size);
        for (let i = 0; i < links.size; i++) {
            let p = Point2.unpack(links.get(i)).sub(tileX, tileY);
            seq.add(p.x, p.y);
        }
        for (let i = 0; i < 6; i++) seq.add(autoFlags[i] ? 1 : 0);
        return seq;
    }

    let flags = 0;
    for (let i = 0; i < 6; i++) if (autoFlags[i]) flags |= (1 << i);

    let parts = [STRING_CONFIG_PREFIX, String(selected), String(flags), String(links.size)];
    for (let i = 0; i < links.size; i++) {
        let p = Point2.unpack(links.get(i)).sub(tileX, tileY);
        parts.push(p.x + "," + p.y);
    }
    return parts.join(";");
};
```


## Source Files:

- `scripts\lib.js`

