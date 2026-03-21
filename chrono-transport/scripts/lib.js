exports.modName = "chrono-transport";
exports.newEffect = (lifetime, renderer) => new Effect(lifetime, cons(renderer));
exports.cons2 = (func) => new Cons2({ get: (v1, v2) => func(v1, v2) });
exports.func  = (getter) => new Func({ get: getter });
exports.int   = (v) => new java.lang.Integer(v);
exports.loadRegion = (name) => {
    if (Vars.headless === true) return null;
    return Core.atlas.find(exports.modName + "-" + name, "error");
};
