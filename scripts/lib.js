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
exports.addAutoConnectButtons = (table, the, getLinks, lvt, clearFn, autoFlags) => {
    let chk0 = table.check("", autoFlags[0]).size(40, 40).get();
    chk0.changed(run(() => { autoFlags[0] = chk0.isChecked(); }));
    table.button("Auto-Connect All",       run(() => { autoConnect(the, getLinks, lvt, null); })).size(100, 40);
    let chk1 = table.check("", autoFlags[1]).size(40, 40).get();
    chk1.changed(run(() => { autoFlags[1] = chk1.isChecked(); }));
    table.button("Auto-Connect Turrets",   run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.turret); })).size(100, 40).row();
    let chk2 = table.check("", autoFlags[2]).size(40, 40).get();
    chk2.changed(run(() => { autoFlags[2] = chk2.isChecked(); }));
    table.button("Auto-Connect Factories", run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.crafting); })).size(100, 40);
    let chk3 = table.check("", autoFlags[3]).size(40, 40).get();
    chk3.changed(run(() => { autoFlags[3] = chk3.isChecked(); }));
    table.button("Auto-Connect Power",     run(() => { autoConnect(the, getLinks, lvt, b => b.block.category == Category.power); })).size(100, 40).row();
    table.button("Clear All Links",        run(() => { the.configure(clearFn()); })).size(280, 40).row();
};
exports.newEffect = (lifetime, renderer) => new Effect(lifetime, cons(renderer));
exports.cons2 = (func) => new Cons2({ get: (v1, v2) => func(v1, v2) });
exports.func  = (getter) => new Func({ get: getter });
exports.int   = (v) => new java.lang.Integer(v);
exports.loadRegion = (name) => {
    if (Vars.headless === true) return null;
    return Core.atlas.find(exports.modName + "-" + name, "error");
};
