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
    table.center();
    const filters = [null, b => b.block.category == Category.turret, b => b.block.category == Category.crafting, b => b.block.category == Category.power];
    const names   = ["All", "Turrets", "Factories", "Power"];
    const getLabel = (i) => (autoFlags[i] ? "[x] " : "[ ] ") + names[i];
    let btns = [];
    for (let idx = 0; idx < 4; idx++) {
        let i = idx, f = filters[i];
        let cell = table.button(getLabel(i), run(() => {
            autoFlags[i] = !autoFlags[i];
            btns[i].setText(getLabel(i));
            if (autoFlags[i]) autoConnect(the, getLinks, lvt, f);
        })).size(150, 40);
        btns.push(cell.get());
        if (i % 2 === 1) cell.row();
    }
    table.button("Clear All Links", run(() => { the.configure(clearFn()); })).size(300, 40).row();
};
exports.newEffect = (lifetime, renderer) => new Effect(lifetime, cons(renderer));
exports.cons2 = (func) => new Cons2({ get: (v1, v2) => func(v1, v2) });
exports.func  = (getter) => new Func({ get: getter });
exports.int   = (v) => new java.lang.Integer(v);
exports.loadRegion = (name) => {
    if (Vars.headless === true) return null;
    return Core.atlas.find(exports.modName + "-" + name, "error");
};
