exports.modName = "item-liquid-teleport";

const CHRONO_NAMES = ["chrono-pusher", "chrono-unloader", "chrono-liquid-pusher", "chrono-liquid-unloader"].map(n => exports.modName + "-" + n);
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
