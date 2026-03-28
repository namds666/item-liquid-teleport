exports.modName = "item-liquid-teleport";

const CHRONO_NAMES = ["chrono-pusher", "chrono-unloader", "chrono-liquid-pusher", "chrono-liquid-unloader"].map(n => exports.modName + "-" + n);
const autoConnect = (the, getLinks, lvt, filter) => {
    let links = getLinks();
    Groups.build.each(cons(b => {
        if (b == the) return;
        if (CHRONO_NAMES.indexOf(b.block.name) >= 0) return;
        if (filter && !filter(b)) return;
        if (!lvt(the, b)) return;
        let int = new java.lang.Integer(b.pos());
        if (!links.contains(boolf(i => i == int))) the.configure(int);
    }));
};
exports.makeScanJob = (autoFlags, chunkSize) => {
    const SCAN_DELAY = 120;
    let snapshot = null, idx = -1, delay = 0;
    return {
        tick(the, getLinks, lvt, clearFn) {
            if (Vars.net.client()) return;
            if (idx >= 0) {
                let links = getLinks();
                let end = Math.min(idx + chunkSize, snapshot.length);
                for (let si = idx; si < end; si++) {
                    let b = snapshot[si];
                    if (!b || b == the) continue;
                    if (CHRONO_NAMES.indexOf(b.block.name) >= 0) continue;
                    if (!lvt(the, b)) continue;
                    if (!((autoFlags[0] && b.block.category == Category.effect) ||
                          (autoFlags[1] && b.block.category == Category.turret) ||
                          (autoFlags[2] && b.block.category == Category.crafting) ||
                          (autoFlags[3] && b.block.category == Category.power) ||
                          (autoFlags[4] && b.block.category == Category.units) ||
                          (autoFlags[5] && b.block.category == Category.production))) continue;
                    let int = new java.lang.Integer(b.pos());
                    if (!links.contains(boolf(i => i == int))) the.configure(int);
                }
                idx = end;
                if (idx >= snapshot.length) { idx = -1; snapshot = null; }
            } else {
                if (!autoFlags[0] && !autoFlags[1] && !autoFlags[2] && !autoFlags[3] && !autoFlags[4] && !autoFlags[5]) return;
                if (++delay >= SCAN_DELAY) {
                    the.configure(clearFn());
                    snapshot = []; Groups.build.each(cons(b => snapshot.push(b)));
                    idx = 0; delay = 0;
                }
            }
        }
    };
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
