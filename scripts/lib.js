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
exports.readTransportConfig = (config, tileX, tileY) => {
    if (!exports.isStringConfig(config)) return null;
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
    for (let i = 0; i < 6; i++) autoFlags[i] = (flags & (1 << i)) !== 0;
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
const autoConnect = (the, getLinks, lvt, filter) => {
    let links = getLinks();
    Groups.build.each(cons(b => {
        if (b == the) return;
        if (CHRONO_NAMES.indexOf(b.block.name) >= 0) return;
        if (b.getClass().getSimpleName() === "ConstructBuild") return;
        if (filter && !filter(b)) return;
        if (!lvt(the, b)) return;
        let int = new java.lang.Integer(b.pos());
        if (!links.contains(boolf(i => i == int))) the.configure(int);
    }));
};
exports.makeScanJob = (autoFlags, chunkSize) => {
    const SCAN_DELAY = 60;
    let snapshot = null, idx = -1, delay = SCAN_DELAY;
    let prevFlags = [false, false, false, false, false, false];
    let linkSet = null;
    let toAdd = [], toRemove = [];
    let scanChanged = false;

    return {
        tick(the, getLinks, lvt, clearFn, batchApply) {
            if (Vars.net.client()) return;

            let anyEnabled = false;
            let flagsChanged = false;
            for (let i = 0; i < 6; i++) {
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

                    let isValidTarget = lvt(the, b) && (
                          (autoFlags[0] && b.block.category == Category.effect) ||
                          (autoFlags[1] && b.block.category == Category.turret) ||
                          (autoFlags[2] && b.block.category == Category.crafting) ||
                          (autoFlags[3] && b.block.category == Category.power) ||
                          (autoFlags[4] && b.block.category == Category.units) ||
                          (autoFlags[5] && b.block.category == Category.production)
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
                    snapshot = []; Groups.build.each(cons(b => snapshot.push(b)));
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
exports.newEffect = (lifetime, renderer) => new Effect(lifetime, cons(renderer));
exports.cons2 = (func) => new Cons2({ get: (v1, v2) => func(v1, v2) });
exports.func = (getter) => new Func({ get: getter });
exports.int = (v) => new java.lang.Integer(v);
exports.loadRegion = (name) => {
    if (Vars.headless === true) return null;
    return Core.atlas.find(exports.modName + "-" + name, "error");
};
exports.enableAllEnvironments = (block) => {
    try {
        block.envEnabled = Packages.mindustry.type.Env.any;
        block.envDisabled = Packages.mindustry.type.Env.none;
        block.envRequired = Packages.mindustry.type.Env.none;
    } catch (e) {}
};
