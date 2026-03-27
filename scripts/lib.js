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
exports.tickAutoConnect = (the, getLinks, lvt, autoFlags) => {
    if (Vars.net.client()) return;
    if (autoFlags[0]) autoConnect(the, getLinks, lvt, null);
    if (autoFlags[1]) autoConnect(the, getLinks, lvt, b => b.block.category == Category.turret);
    if (autoFlags[2]) autoConnect(the, getLinks, lvt, b => b.block.category == Category.crafting);
    if (autoFlags[3]) autoConnect(the, getLinks, lvt, b => b.block.category == Category.power);
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
    const bw = 150;
    const cw = 40;
    const bh = 40;
    const sp = 10;

    makeCheck(table, autoFlags, 0);
    table.button("Auto-Connect All",       run(() => { autoConnect(the, getLinks, lvt, null); })).size(bw, bh).padRight(sp);
    makeCheck(table, autoFlags, 1);
    table.button("Auto-Connect Turrets",   run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.turret); })).size(bw, bh).row();
    
    makeCheck(table, autoFlags, 2);
    table.button("Auto-Connect Factories", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.crafting); })).size(bw, bh).padRight(sp);
    makeCheck(table, autoFlags, 3);
    table.button("Auto-Connect Power",     run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.power); })).size(bw, bh).row();
    
    table.button("Clear All Links",        run(() => { the.configure(clearFn()); })).size(bw * 2 + cw * 2 + sp, bh).colspan(4).padTop(4).row();
};
exports.newEffect = (lifetime, renderer) => new Effect(lifetime, cons(renderer));
exports.cons2 = (func) => new Cons2({ get: (v1, v2) => func(v1, v2) });
exports.func  = (getter) => new Func({ get: getter });
exports.int   = (v) => new java.lang.Integer(v);
exports.loadRegion = (name) => {
    if (Vars.headless === true) return null;
    return Core.atlas.find(exports.modName + "-" + name, "error");
};
