exports.modName = "item-liquid-teleport";

const CHRONO_NAMES = ["chrono-pusher", "chrono-unloader", "chrono-liquid-pusher", "chrono-liquid-unloader"].map(n => exports.modName + "-" + n);
const STRING_CONFIG_PREFIX = "ctl1";
const MAX_INTSEQ_CONFIG_LINKS = 96;

exports.isStringConfig = config => {
    try {
        return typeof config === "string" || java.lang.String.__javaObject__.isInstance(config);
    } catch (e) {
        return typeof config === "string";
    }
};
exports.transportConfig = (selectedId, links, tileX, tileY, autoFlags) => {
    let selected = selectedId == null ? -1 : selectedId;
    let flagCount = autoFlags == null ? 0 : autoFlags.length;
    let maxSeqLinks = Math.min(MAX_INTSEQ_CONFIG_LINKS, Math.floor((200 - 2 - flagCount) / 2));
    if (links.size <= maxSeqLinks) {
        let seq = new IntSeq(links.size*2 + 2 + flagCount);
        seq.add(selected);
        seq.add(links.size);
        for (let i = 0; i < links.size; i++) {
            let p = Point2.unpack(links.get(i)).sub(tileX, tileY);
            seq.add(p.x, p.y);
        }
        for (let i = 0; i < flagCount; i++) seq.add(autoFlags[i] ? 1 : 0);
        return seq;
    }

    let flags = 0;
    for (let i = 0; i < flagCount; i++) if (autoFlags[i]) flags |= (1 << i);

    let parts = [STRING_CONFIG_PREFIX, String(selected), String(flags), String(links.size)];
    for (let i = 0; i < links.size; i++) {
        let p = Point2.unpack(links.get(i)).sub(tileX, tileY);
        parts.push(p.x + "," + p.y);
    }
    return parts.join(";");
};
exports.readTransportConfig = (config, tileX, tileY, flagCount) => {
    if (!exports.isStringConfig(config)) return null;
    let countFlags = flagCount == null ? 6 : flagCount;
    let parts = String(config).split(";");
    if (parts.length < 4 || parts[0] !== STRING_CONFIG_PREFIX) return null;

    let selectedId = parseInt(parts[1], 10);
    let flags = parseInt(parts[2], 10);
    let count = parseInt(parts[3], 10);
    if (isNaN(selectedId)) selectedId = -1;
    if (isNaN(flags)) flags = 0;
    if (isNaN(count)) count = Math.max(0, parts.length - 4);

    let links = new Seq(java.lang.Integer);
    for (let i = 0; i < count && 4 + i < parts.length; i++) {
        let xy = parts[4 + i].split(",");
        if (xy.length !== 2) continue;
        let dx = parseInt(xy[0], 10), dy = parseInt(xy[1], 10);
        if (isNaN(dx) || isNaN(dy)) continue;
        links.add(exports.int(Point2.pack(dx + tileX, dy + tileY)));
    }

    let autoFlags = [];
    for (let i = 0; i < countFlags; i++) autoFlags[i] = (flags & (1 << i)) !== 0;
    return { selectedId: selectedId, links: links, autoFlags: autoFlags };
};
exports.pointTransportConfig = (config, transformer) => {
    if (!exports.isStringConfig(config)) return config;
    let parts = String(config).split(";");
    if (parts.length < 4 || parts[0] !== STRING_CONFIG_PREFIX) return config;

    let count = parseInt(parts[3], 10);
    if (isNaN(count)) count = Math.max(0, parts.length - 4);

    let out = [STRING_CONFIG_PREFIX, parts[1], parts[2], "0"];
    let written = 0;
    for (let i = 0; i < count && 4 + i < parts.length; i++) {
        let xy = parts[4 + i].split(",");
        if (xy.length !== 2) continue;
        let dx = parseInt(xy[0], 10), dy = parseInt(xy[1], 10);
        if (isNaN(dx) || isNaN(dy)) continue;
        let p = new Point2(dx*2 - 1, dy*2 - 1);
        transformer.get(p);
        out.push(Math.floor((p.x + 1)/2) + "," + Math.floor((p.y + 1)/2));
        written++;
    }
    out[3] = String(written);
    return out.join(";");
};
function eachArrayLike(values, fn) {
    if (values == null) return false;
    let length = null;
    try { length = values.length; } catch (e) {}
    if (typeof length === "number") {
        for (let i = 0; i < length; i++) if (fn(values[i])) return true;
        return false;
    }
    let size = null;
    try { size = values.size; } catch (e) {}
    if (typeof size === "function") {
        try { size = values.size(); } catch (e) { size = null; }
    }
    if (typeof size === "number") {
        for (let i = 0; i < size; i++) {
            let v = null;
            try { v = values.get ? values.get(i) : values[i]; } catch (e) {
                try { v = values[i]; } catch (ignored) {}
            }
            if (fn(v)) return true;
        }
        return false;
    }
    return false;
}
function mapHasKey(map, key) {
    if (map == null || key == null) return false;
    try { if (map.containsKey && map.containsKey(key)) return true; } catch (e) {}
    try { if (map.get && map.get(key) != null) return true; } catch (e) {}
    return false;
}
function stackMatches(stack, resource, field) {
    if (stack == null) return false;
    if (resource == null) return true;
    try { if (stack[field] === resource) return true; } catch (e) {}
    try { if (stack[field] == resource) return true; } catch (e) {}
    return false;
}
function anyStackField(obj, names, resource, field) {
    if (obj == null) return false;
    for (let ni = 0; ni < names.length; ni++) {
        let values = null;
        try { values = obj[names[ni]]; } catch (e) {}
        if (values == null) continue;
        if (stackMatches(values, resource, field)) return true;
        if (eachArrayLike(values, v => stackMatches(v, resource, field))) return true;
    }
    return false;
}
function directResourceField(obj, names, resource) {
    if (obj == null) return false;
    for (let ni = 0; ni < names.length; ni++) {
        let value = null;
        try { value = obj[names[ni]]; } catch (e) {}
        if (value == null) continue;
        if (resource == null || value == resource) return true;
    }
    return false;
}
function consumers(block) {
    if (block == null) return null;
    try {
        if (typeof block.consumes === "function") return block.consumes();
        return block.consumes;
    } catch (e) { return null; }
}
function consumerByType(block, typeName) {
    let cons = consumers(block);
    if (cons == null) return null;
    try {
        let type = Packages.mindustry.world.consumers.ConsumeType[typeName];
        if (type != null && cons.get != null) return cons.get(type);
    } catch (e) {}
    return null;
}
function anyConsumer(block, predicate) {
    let cons = consumers(block);
    if (cons == null) return false;
    try {
        let all = typeof cons.all === "function" ? cons.all() : cons.all;
        if (eachArrayLike(all, predicate)) return true;
    } catch (e) {}
    return false;
}
function callBool(obj, name, args) {
    if (obj == null) return false;
    try {
        let fn = obj[name];
        if (fn != null) return !!fn.apply(obj, args);
    } catch (e) {}
    try {
        if (args.length == 1) return !!obj[name](args[0]);
        if (args.length == 2) return !!obj[name](args[0], args[1]);
        if (args.length == 3) return !!obj[name](args[0], args[1], args[2]);
    } catch (e) {}
    return false;
}
function callNumber(obj, name, args) {
    if (obj == null) return 0;
    try {
        let fn = obj[name];
        if (fn != null) {
            let out = fn.apply(obj, args);
            return out == null ? 0 : Number(out);
        }
    } catch (e) {}
    try {
        let out = null;
        if (args.length == 1) out = obj[name](args[0]);
        else if (args.length == 2) out = obj[name](args[0], args[1]);
        else if (args.length == 3) out = obj[name](args[0], args[1], args[2]);
        return out == null ? 0 : Number(out);
    } catch (e) {}
    return 0;
}
function blockOutputsItems(block) {
    if (block == null) return false;
    if (callBool(block, "outputsItems", [])) return true;
    try { if (block.outputsItems === true) return true; } catch (e) {}
    return false;
}
function blockOutputsLiquidAny(block) {
    if (block == null) return false;
    try { if (block.outputsLiquid === true) return true; } catch (e) {}
    if (callBool(block, "outputsLiquid", [])) return true;
    return false;
}
exports.blockConsumesItem = (block, item) => {
    if (block == null || item == null) return false;
    if (mapHasKey(block.ammoTypes, item)) return true;
    let consumer = consumerByType(block, "item");
    return anyStackField(consumer, ["items"], item, "item") ||
           anyConsumer(block, c => anyStackField(c, ["items"], item, "item"));
};
exports.blockConsumesAnyItem = block => {
    if (block == null) return false;
    try { if (block.ammoTypes != null && block.ammoTypes.size > 0) return true; } catch (e) {}
    let consumer = consumerByType(block, "item");
    return anyStackField(consumer, ["items"], null, "item") ||
           anyConsumer(block, c => anyStackField(c, ["items"], null, "item"));
};
exports.blockOutputsItem = (block, item) => {
    if (block == null || item == null) return false;
    return (blockOutputsItems(block) && directResourceField(block, ["itemDrop"], item)) ||
           anyStackField(block, ["outputItem", "outputItems", "results"], item, "item") ||
           directResourceField(block, ["itemDrop", "outputItem"], item);
};
exports.blockOutputsAnyItem = block => {
    if (block == null) return false;
    return blockOutputsItems(block) ||
           anyStackField(block, ["outputItem", "outputItems", "results"], null, "item") ||
           directResourceField(block, ["itemDrop", "outputItem"], null);
};
exports.blockConsumesLiquid = (block, liquid) => {
    if (block == null || liquid == null) return false;
    if (mapHasKey(block.ammoTypes, liquid)) return true;
    let consumer = consumerByType(block, "liquid");
    return anyStackField(consumer, ["liquids"], liquid, "liquid") ||
           directResourceField(consumer, ["liquid"], liquid) ||
           anyConsumer(block, c => anyStackField(c, ["liquids"], liquid, "liquid") || directResourceField(c, ["liquid"], liquid));
};
exports.blockConsumesAnyLiquid = block => {
    if (block == null) return false;
    try { if (block.ammoTypes != null && block.ammoTypes.size > 0) return true; } catch (e) {}
    let consumer = consumerByType(block, "liquid");
    return anyStackField(consumer, ["liquids"], null, "liquid") ||
           directResourceField(consumer, ["liquid"], null) ||
           anyConsumer(block, c => anyStackField(c, ["liquids"], null, "liquid") || directResourceField(c, ["liquid"], null));
};
exports.blockOutputsLiquid = (block, liquid) => {
    if (block == null || liquid == null) return false;
    return (blockOutputsLiquidAny(block) && directResourceField(block, ["liquidDrop", "pumpLiquid"], liquid)) ||
           anyStackField(block, ["outputLiquid", "outputLiquids"], liquid, "liquid") ||
           directResourceField(block, ["liquidDrop", "pumpLiquid", "outputLiquid"], liquid);
};
exports.blockOutputsAnyLiquid = block => {
    if (block == null) return false;
    return blockOutputsLiquidAny(block) ||
           anyStackField(block, ["outputLiquid", "outputLiquids"], null, "liquid") ||
           directResourceField(block, ["liquidDrop", "pumpLiquid", "outputLiquid"], null);
};
exports.buildConsumesItem = (build, item) => {
    if (build == null || item == null) return false;
    try { if (build.chronoConsumesItem && build.chronoConsumesItem(item)) return true; } catch (e) {}
    if (callNumber(build, "acceptStack", [item, 1, null]) > 0) return true;
    if (callBool(build, "acceptItem", [null, item])) return true;
    return exports.blockConsumesItem(build.block, item);
};
exports.buildConsumesAnyItem = build => {
    if (build == null) return false;
    try { if (build.chronoConsumesAnyItem && build.chronoConsumesAnyItem()) return true; } catch (e) {}
    try {
        for (let i = 0; i < Vars.content.items().size; i++) {
            if (exports.buildConsumesItem(build, Vars.content.items().get(i))) return true;
        }
    } catch (e) {}
    return exports.blockConsumesAnyItem(build.block);
};
exports.buildOutputsItem = (build, item) => {
    if (build == null || item == null) return false;
    try { if (build.chronoOutputsItem && build.chronoOutputsItem(item)) return true; } catch (e) {}
    if (callBool(build, "canDump", [null, item])) return true;
    try { if (blockOutputsItems(build.block) && build.items != null && build.items.get(item) > 0) return true; } catch (e) {}
    return exports.blockOutputsItem(build.block, item);
};
exports.buildOutputsAnyItem = build => {
    if (build == null) return false;
    try { if (build.chronoOutputsAnyItem && build.chronoOutputsAnyItem()) return true; } catch (e) {}
    try {
        for (let i = 0; i < Vars.content.items().size; i++) {
            if (exports.buildOutputsItem(build, Vars.content.items().get(i))) return true;
        }
    } catch (e) {}
    return exports.blockOutputsAnyItem(build.block);
};
exports.buildConsumesLiquid = (build, liquid) => {
    if (build == null || liquid == null) return false;
    try { if (build.chronoConsumesLiquid && build.chronoConsumesLiquid(liquid)) return true; } catch (e) {}
    if (callBool(build, "acceptLiquid", [null, liquid])) return true;
    return exports.blockConsumesLiquid(build.block, liquid);
};
exports.buildConsumesAnyLiquid = build => {
    if (build == null) return false;
    try { if (build.chronoConsumesAnyLiquid && build.chronoConsumesAnyLiquid()) return true; } catch (e) {}
    try {
        for (let i = 0; i < Vars.content.liquids().size; i++) {
            if (exports.buildConsumesLiquid(build, Vars.content.liquids().get(i))) return true;
        }
    } catch (e) {}
    return exports.blockConsumesAnyLiquid(build.block);
};
exports.buildOutputsLiquid = (build, liquid) => {
    if (build == null || liquid == null) return false;
    try { if (build.chronoOutputsLiquid && build.chronoOutputsLiquid(liquid)) return true; } catch (e) {}
    try { if (blockOutputsLiquidAny(build.block) && build.liquids != null && build.liquids.get(liquid) > 0.001) return true; } catch (e) {}
    return exports.blockOutputsLiquid(build.block, liquid);
};
exports.buildOutputsAnyLiquid = build => {
    if (build == null) return false;
    try { if (build.chronoOutputsAnyLiquid && build.chronoOutputsAnyLiquid()) return true; } catch (e) {}
    try {
        for (let i = 0; i < Vars.content.liquids().size; i++) {
            if (exports.buildOutputsLiquid(build, Vars.content.liquids().get(i))) return true;
        }
    } catch (e) {}
    return exports.blockOutputsAnyLiquid(build.block);
};
// Liquid transport / pass-through blocks must not be auto-linked: the pusher/unloader
// should connect to real producers & consumers, not relays. Class checks catch every
// variant (vanilla + Erekir reinforced + modded subclasses); the name list is a
// fallback for blocks that don't share one of these base classes.
const EXCLUDED_LIQUID_LINK_NAMES = [
    "liquid-junction", "reinforced-liquid-junction",
    "liquid-router", "reinforced-liquid-router",
    "liquid-container", "reinforced-liquid-container",
    "liquid-tank", "reinforced-liquid-tank",
    "conduit", "pulse-conduit", "plated-conduit", "reinforced-conduit",
    "bridge-conduit", "phase-conduit", "reinforced-bridge-conduit"
];
const isExcludedLiquidClass = block => {
    try {
        // LiquidRouter covers router, container and tank (all variants)
        if (block instanceof Packages.mindustry.world.blocks.liquid.LiquidRouter) return true;
        if (block instanceof Packages.mindustry.world.blocks.liquid.LiquidJunction) return true;
        // Conduit covers every pipe, incl. ArmoredConduit (plated/reinforced)
        if (block instanceof Packages.mindustry.world.blocks.liquid.Conduit) return true;
        // LiquidBridge covers bridge & phase conduits
        if (block instanceof Packages.mindustry.world.blocks.liquid.LiquidBridge) return true;
    } catch (e) {}
    return false;
};
exports.isValidLiquidLinkTarget = build => {
    if (build == null || build.block == null) return false;
    if (isExcludedLiquidClass(build.block)) return false;
    return EXCLUDED_LIQUID_LINK_NAMES.indexOf(build.block.name) < 0;
};
// Groups.build holds only update=true, non-sleeping buildings; this Seq holds every one
const teamBuildings = (team) => {
    if (team == null || Vars.state == null) return null;
    let td;
    try { td = team.data(); } catch (e) { return null; }
    return td == null ? null : td.buildings;
};
const eachBuilding = (fn) => {
    if (Vars.state == null) return;
    let present = Vars.state.teams.present;
    if (present == null) return;
    let pItems = present.items, pSize = present.size;
    for (let pi = 0; pi < pSize; pi++) {
        let td = pItems[pi];
        if (td == null) continue;
        let seq = td.buildings;
        if (seq == null) continue;
        let items = seq.items, size = seq.size;
        for (let i = 0; i < size; i++) if (items[i] != null) fn(items[i]);
    }
};
const autoConnect = (the, getLinks, lvt, filter, targetFilter) => {
    let links = getLinks();
    eachBuilding(b => {
        if (b == the) return;
        if (CHRONO_NAMES.indexOf(b.block.name) >= 0) return;
        if (b.getClass().getSimpleName() === "ConstructBuild") return;
        if (filter && !filter(b)) return;
        if (!lvt(the, b)) return;
        if (targetFilter && !targetFilter(b)) return;
        let int = new java.lang.Integer(b.pos());
        if (!links.contains(boolf(i => i == int))) the.configure(int);
    });
};
exports.makeScanJob = (autoFlags, chunkSize) => {
    const SCAN_DELAY = 60;
    let snapshot = null, idx = -1, delay = SCAN_DELAY;
    let prevFlags = [];
    let linkSet = null;
    let toAdd = [], toRemove = [];
    let scanChanged = false;

    return {
        tick(the, getLinks, lvt, clearFn, batchApply, targetFilter) {
            if (Vars.net.client()) return;

            let anyEnabled = false;
            let flagsChanged = false;
            for (let i = 0; i < autoFlags.length; i++) {
                if (autoFlags[i]) anyEnabled = true;
                if (autoFlags[i] !== prevFlags[i]) flagsChanged = true;
                prevFlags[i] = autoFlags[i];
            }
            if (flagsChanged && anyEnabled && idx < 0) {
                delay = SCAN_DELAY;
            }

            if (idx >= 0) {
                // Build linkSet once at scan start for O(1) lookup
                if (linkSet == null) {
                    linkSet = new Set();
                    let it = getLinks().iterator();
                    while (it.hasNext()) linkSet.add(it.next() | 0);
                }

                let end = Math.min(idx + chunkSize, snapshot.length);
                for (let si = idx; si < end; si++) {
                    let b = snapshot[si];
                    if (!b || b == the) continue;
                    if (CHRONO_NAMES.indexOf(b.block.name) >= 0) continue;
                    if (b.getClass().getSimpleName() === "ConstructBuild") continue;

                    let pos = b.pos() | 0;
                    let hasLink = linkSet.has(pos);

                    let isValidTarget = lvt(the, b) && (!targetFilter || targetFilter(b)) && (
                          (autoFlags[0] && b.block.category == Category.effect) ||
                          (autoFlags[1] && b.block.category == Category.turret) ||
                          (autoFlags[2] && b.block.category == Category.crafting) ||
                          (autoFlags[3] && b.block.category == Category.power) ||
                          (autoFlags[4] && b.block.category == Category.units) ||
                          (autoFlags[5] && b.block.category == Category.production) ||
                          (autoFlags[6] && b.block.category == Category.liquid)
                    );

                    if (isValidTarget && !hasLink) {
                        if (batchApply) { toAdd.push(pos); linkSet.add(pos); }
                        else the.configure(new java.lang.Integer(pos));
                    } else if (!isValidTarget && hasLink) {
                        if (batchApply) { toRemove.push(pos); linkSet.delete(pos); }
                        else the.configure(new java.lang.Integer(pos));
                    }
                }
                idx = end;

                if (batchApply && (toAdd.length > 0 || toRemove.length > 0)) {
                    batchApply(toAdd, toRemove);
                    toAdd = []; toRemove = [];
                    scanChanged = true;
                }

                if (idx >= snapshot.length) {
                    idx = -1; snapshot = null; linkSet = null;
                    toAdd = []; toRemove = [];
                    if (scanChanged && !Vars.net.client()) { the.configure(the.config()); scanChanged = false; }
                }
            } else {
                if (!anyEnabled) {
                    delay = SCAN_DELAY;
                    return;
                }
                if (++delay >= SCAN_DELAY) {
                    snapshot = []; eachBuilding(b => snapshot.push(b));
                    idx = 0; delay = 0;
                }
            }
        }
    };
};
exports.makeBatchApply = (getLinks) => (toAdd, toRemove) => {
    let links = getLinks();
    for (let pos of toAdd) links.add(exports.int(pos));
    for (let pos of toRemove) { let int = exports.int(pos); links.remove(boolf(i => i == int)); }
    // configure sync is deferred to scan end in makeScanJob to avoid mid-scan cap truncation
};
const makeCheck = (table, autoFlags, idx) => {
    let chk = new CheckBox("");
    chk.setChecked(autoFlags[idx]);
    chk.changed(run(() => { autoFlags[idx] = chk.isChecked(); }));
    table.add(chk).size(40, 40);
    return chk;
};
exports.addAutoConnectButtons = (table, the, getLinks, lvt, clearFn, autoFlags, targetFilter) => {
    table.center();
    const bw = 150; // Button width
    const cw = 40;  // Checkbox width
    const bh = 40;  // Button and Checkbox height 
    const sp = 20;  // Horizontal spacing between button groups

    makeCheck(table, autoFlags, 0);
    table.button("Misc", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.effect, targetFilter); })).size(bw, bh).padRight(sp);
    makeCheck(table, autoFlags, 1);
    table.button("Turret", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.turret, targetFilter); })).size(bw, bh).row();
    makeCheck(table, autoFlags, 2);
    table.button("Factory", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.crafting, targetFilter); })).size(bw, bh).padRight(sp);
    makeCheck(table, autoFlags, 3);
    table.button("Power", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.power, targetFilter); })).size(bw, bh).row();
    makeCheck(table, autoFlags, 4);
    table.button("Unit", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.units, targetFilter); })).size(bw, bh).padRight(sp);
    makeCheck(table, autoFlags, 5);
    table.button("Drill", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.production, targetFilter); })).size(bw, bh).row();
    makeCheck(table, autoFlags, 6);
    table.button("Liquid", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.liquid, targetFilter); })).size(bw, bh).row();
    table.button("Clear All Links", run(() => { the.configure(clearFn()); })).size(bw * 2 + cw * 2 + sp, bh).colspan(4).padTop(4).row();
};
exports.newEffect = (lifetime, renderer) => new Effect(lifetime, cons(renderer));
exports.cons2 = (func) => new Cons2({ get: (v1, v2) => func(v1, v2) });
exports.func = (getter) => new Func({ get: getter });
exports.int = (v) => new java.lang.Integer(v);
exports.loadRegion = (name) => {
    if (Vars.headless === true) return null;
    return Core.atlas.find(exports.modName + "-" + name, "error");
};
exports.teamBuildings = teamBuildings;
exports.eachBuilding = eachBuilding;
exports.enableAllEnvironments = (block) => {
    try {
        block.envEnabled = Packages.mindustry.type.Env.any;
        block.envDisabled = Packages.mindustry.type.Env.none;
        block.envRequired = Packages.mindustry.type.Env.none;
    } catch (e) {}
};
