exports.modName = "item-liquid-teleport";

const CHRONO_NAMES = ["chrono-pusher", "chrono-unloader", "chrono-liquid-pusher", "chrono-liquid-unloader"];
exports.autoConnectAll = (the, links, lvt) => {
    Groups.build.each(cons(b => {
        if (b == the) return;
        if (CHRONO_NAMES.indexOf(b.block.name) >= 0) return;
        if (!lvt(the, b)) return;
        let int = new java.lang.Integer(b.pos());
        if (!links.contains(boolf(i => i == int))) the.configure(int);
    }));
};
exports.addAutoConnectButtons = (table, the, links, lvt, clearFn) => {
    table.button("Auto-Connect All", run(() => { exports.autoConnectAll(the, links, lvt); })).size(180, 40).row();
    table.button("Clear All Links", run(() => { the.configure(clearFn()); })).size(180, 40).row();
};
exports.newEffect = (lifetime, renderer) => new Effect(lifetime, cons(renderer));
exports.cons2 = (func) => new Cons2({ get: (v1, v2) => func(v1, v2) });
exports.func  = (getter) => new Func({ get: getter });
exports.int   = (v) => new java.lang.Integer(v);
exports.loadRegion = (name) => {
    if (Vars.headless === true) return null;
    return Core.atlas.find(exports.modName + "-" + name, "error");
};
