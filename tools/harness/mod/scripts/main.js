const TAG = "[HARNESS]";
const TEAM = Team.sharded;
const ENEMY = Team.crux;
const SETUP_TICK = 30;
const FINAL_TICK = 330;
const LONG_TICK = 1500;
const RELOAD_TICK = 120;
const TS = Vars.tilesize;

let ticks = -1;
let phase = 0;
let claimed = [];
let tests = [];

function log(s) { Log.info(TAG + " " + s); }
function maxHp(b) { return typeof b.maxHealth === "function" ? b.maxHealth() : b.maxHealth; }
function modBlock(name) { return Vars.content.block("item-liquid-teleport-" + name); }
function intSeq(values) { let s = new IntSeq(values.length); for (let i = 0; i < values.length; i++) s.add(values[i]); return s; }
function jint(v) { return new java.lang.Integer(v); }
function num(obj, name) { let v = obj[name]; return typeof v === "function" ? v.call(obj) : v; }

function tileFree(t) {
    return t != null && t.build == null && t.block() == Blocks.air && !t.floor().isLiquid && !t.floor().isDeep();
}

function areaFree(x0, y0, w, h) {
    for (let y = y0 - 1; y <= y0 + h; y++)
        for (let x = x0 - 1; x <= x0 + w; x++)
            if (!tileFree(Vars.world.tile(x, y))) return false;
    for (let i = 0; i < claimed.length; i++) {
        let c = claimed[i], m = 3;
        if (x0 < c.x + c.w + m && x0 + w + m > c.x && y0 < c.y + c.h + m && y0 + h + m > c.y) return false;
    }
    return true;
}

function claimArea(w, h) {
    const core = TEAM.core();
    if (core == null) return null;
    const cx = core.tile.x, cy = core.tile.y;
    for (let r = 6; r < 100; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) != r && Math.abs(dy) != r) continue;
                if (areaFree(cx + dx, cy + dy, w, h)) {
                    let a = { x: cx + dx, y: cy + dy, w: w, h: h };
                    claimed.push(a);
                    return a;
                }
            }
        }
    }
    return null;
}

function place(block, x, y, team) {
    const t = Vars.world.tile(x, y);
    if (t == null) throw "no tile at " + x + "," + y;
    t.setBlock(block, team || TEAM, 0);
    const b = t.build;
    if (b == null || b.block != block) throw "failed to place " + block.name + " at " + x + "," + y + " got " + (b == null ? "null" : b.block.name);
    return b;
}

function spawn(type, team, tx, ty) {
    let u = type.spawn(team, tx * TS, ty * TS);
    if (u == null) throw "spawn failed";
    return u;
}

function ringTiles(cx, cy, radius) {
    let out = [];
    for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx == 0 && dy == 0) continue;
            if (dx * dx + dy * dy > radius * radius) continue;
            let t = Vars.world.tile(cx + dx, cy + dy);
            if (t != null) out.push(t);
        }
    return out;
}

function test(name, w, h, setup, check, poll, opts) {
    opts = opts || {};
    tests.push({ name: name, w: w, h: h, setup: setup, check: check, poll: poll, reload: opts.reload, long: !!opts.long, state: {}, area: null, error: null });
}

function pollAll() {
    for (let i = 0; i < tests.length; i++) {
        let t = tests[i];
        if (t.error != null || !t.poll || ticks >= (t.long ? LONG_TICK : FINAL_TICK)) continue;
        try { t.poll(t.area, t.state); } catch (e) { log("poll " + t.name + " ERROR " + e); }
    }
}

// ── Tests ───────────────────────────────────────────────────────────────

test("mender", 18, 2, (a, s) => {
    s.mender = place(modBlock("chrono-mender"), a.x, a.y);
    let blocks = [Blocks.copperWall, Blocks.conveyor, Blocks.sorter, Blocks.duo, Blocks.container];
    s.targets = [];
    for (let i = 0; i < blocks.length; i++) {
        let b = place(blocks[i], a.x + 3 + i * 3, a.y);
        b.health = maxHp(b) * 0.1;
        s.targets.push(b);
    }
}, (a, s) => {
    let healed = 0, info = [];
    for (let i = 0; i < s.targets.length; i++) {
        let b = s.targets[i];
        if (!b.damaged()) healed++;
        info.push(b.block.name + "=" + Math.round(b.health) + "/" + maxHp(b));
    }
    return { pass: healed == s.targets.length, info: info.join(" ") };
});

test("unloader", 8, 3, (a, s) => {
    s.vault = place(Blocks.vault, a.x + 1, a.y + 1);
    s.vault.items.add(Items.copper, 500);
    s.unl = place(modBlock("chrono-unloader"), a.x + 4, a.y);
    s.sink = place(Blocks.container, a.x + 5, a.y);
    s.unl.configured(null, Items.copper);
    s.unl.configured(null, jint(s.vault.pos()));
}, (a, s) => {
    let got = s.sink.items.get(Items.copper), left = s.vault.items.get(Items.copper);
    return { pass: got > 0 && left < 500, info: "sink=" + got + " vault=" + left + " links=" + s.unl.getLinks().size };
});

test("pusher", 7, 2, (a, s) => {
    s.pusher = place(modBlock("chrono-pusher"), a.x, a.y);
    s.pusher.items.add(Items.copper, 200);
    s.target = place(Blocks.container, a.x + 4, a.y);
    s.pusher.configured(null, jint(s.target.pos()));
}, (a, s) => {
    let got = s.target.items.get(Items.copper);
    return { pass: got > 0, info: "target=" + got + " pusher=" + s.pusher.items.get(Items.copper) + " links=" + s.pusher.getLink().size };
});

test("pusher-crafter", 7, 2, (a, s) => {
    s.pusher = place(modBlock("chrono-pusher"), a.x, a.y);
    s.pusher.items.add(Items.coal, 100);
    s.press = place(Blocks.graphitePress, a.x + 4, a.y);
    s.pusher.configured(null, jint(s.press.pos()));
}, (a, s) => {
    let got = s.press.items.get(Items.coal) + s.press.items.get(Items.graphite) * 2;
    return { pass: got > 0, info: "press.coal=" + s.press.items.get(Items.coal) + " graphite=" + s.press.items.get(Items.graphite) + " pusher.coal=" + s.pusher.items.get(Items.coal) + " links=" + s.pusher.getLink().size };
});

test("api-types", 12, 2, (a, s) => {
    let objs = {
        wall: place(Blocks.copperWall, a.x, a.y),
        container: place(Blocks.container, a.x + 2, a.y),
        press: place(Blocks.graphitePress, a.x + 5, a.y),
        conveyor: place(Blocks.conveyor, a.x + 8, a.y),
        duo: place(Blocks.duo, a.x + 10, a.y),
        core: TEAM.core(),
        mender: place(modBlock("chrono-mender"), a.x + 12, a.y),
        unit: spawn(UnitTypes.dagger, TEAM, a.x + 6, a.y + 3)
    };
    let names = ["team", "x", "y", "health", "maxHealth", "dead", "timer", "timeScale", "hitTime", "id", "rotation", "type"];
    s.bad = [];
    for (let k in objs) {
        let o = objs[k], parts = [];
        for (let i = 0; i < names.length; i++) {
            let v; try { v = o[names[i]]; } catch (e) { v = "ERR"; }
            let ty = typeof v;
            if (v != null && ty === "object" && !(v instanceof Team)) ty = "" + v.getClass().getSimpleName();
            parts.push(names[i] + ":" + ty);
            if (ty === "function") s.bad.push(k + "." + names[i]);
        }
        log("TYPES " + k + "(" + o.getClass().getSimpleName() + ") " + parts.join(" "));
    }
}, (a, s) => {
    return { pass: true, info: "field reads resolving to a function: " + (s.bad.length == 0 ? "none" : s.bad.join(",")) };
});

test("liquid-unloader", 8, 3, (a, s) => {
    s.src = place(Blocks.liquidSource, a.x, a.y);
    s.src.configured(null, Liquids.water);
    s.unl = place(modBlock("chrono-liquid-unloader"), a.x + 3, a.y);
    s.sink = place(Blocks.liquidTank, a.x + 5, a.y + 1);
    s.unl.configured(null, Liquids.water);
    s.unl.configured(null, jint(s.src.pos()));
}, (a, s) => {
    let got = s.sink.liquids.get(Liquids.water);
    return { pass: got > 0.1, info: "tank=" + got.toFixed(1) + " src=" + s.src.liquids.get(Liquids.water).toFixed(1) + " links=" + s.unl.getLinks().size };
});

test("liquid-pusher", 7, 2, (a, s) => {
    s.pusher = place(modBlock("chrono-liquid-pusher"), a.x, a.y);
    s.pusher.liquids.add(Liquids.water, 5000);
    s.target = place(Blocks.wave, a.x + 4, a.y);
    s.pusher.configured(null, Liquids.water);
    s.pusher.configured(null, jint(s.target.pos()));
}, (a, s) => {
    let got = s.target.liquids.get(Liquids.water);
    return { pass: got > 0.1, info: "wave=" + got.toFixed(1) + " pusher=" + s.pusher.liquids.get(Liquids.water).toFixed(1) + " links=" + s.pusher.getLinks().size };
});

test("item-converter", 6, 2, (a, s) => {
    s.power = place(Blocks.powerSource, a.x, a.y);
    s.conv = place(modBlock("chrono-item-converter"), a.x + 1, a.y);
    s.sink = place(Blocks.container, a.x + 3, a.y);
    s.conv.configured(null, intSeq([Items.copper.id, Items.graphite.id, 8]));
    s.conv.items.add(Items.copper, 100);
}, (a, s) => {
    let copper = s.conv.items.get(Items.copper);
    let graphite = s.conv.items.get(Items.graphite) + s.sink.items.get(Items.graphite);
    return { pass: copper < 100 && graphite > 0, info: "copper=" + copper + " graphite=" + graphite + " eff=" + s.conv.efficiency + " power=" + s.conv.power.status.toFixed(2) };
});

test("liquid-tiler", 5, 5, (a, s) => {
    s.tiler = place(modBlock("chrono-liquid-tiler"), a.x + 2, a.y + 2);
    s.tiler.configured(null, intSeq([Liquids.water.id, 2]));
    s.tiler.liquids.add(Liquids.water, 10);
}, (a, s) => {
    let tiles = ringTiles(a.x + 2, a.y + 2, 2), painted = 0;
    for (let i = 0; i < tiles.length; i++) if (tiles[i].floor() == Blocks.water) painted++;
    return { pass: painted >= 3, info: "painted=" + painted + "/" + tiles.length + " water=" + s.tiler.liquids.get(Liquids.water).toFixed(1) };
});

test("item-tiler", 5, 5, (a, s) => {
    s.tiler = place(modBlock("chrono-item-tiler"), a.x + 2, a.y + 2);
    s.tiler.configured(null, intSeq([Items.copper.id, 2, 0, Blocks.oreCopper.id]));
    s.tiler.items.add(Items.copper, 10);
}, (a, s) => {
    let tiles = ringTiles(a.x + 2, a.y + 2, 2), painted = 0;
    for (let i = 0; i < tiles.length; i++) if (tiles[i].overlay() == Blocks.oreCopper) painted++;
    return { pass: painted >= 3, info: "painted=" + painted + "/" + tiles.length + " copper=" + s.tiler.items.get(Items.copper) };
});

test("repair-point", 4, 1, (a, s) => {
    s.power = place(Blocks.powerSource, a.x, a.y);
    s.rp = place(modBlock("chrono-repair-point"), a.x + 1, a.y);
    s.unit = spawn(UnitTypes.dagger, TEAM, a.x + 3, a.y);
    s.unit.health = maxHp(s.unit) * 0.1;
}, (a, s) => {
    let hp = s.unit.health, max = maxHp(s.unit);
    return { pass: s.unit.isValid() && hp > max * 0.9, info: "unit=" + Math.round(hp) + "/" + max + " eff=" + s.rp.efficiency + " target=" + (s.rp.target != null) };
});

test("build-tower", 6, 1, (a, s) => {
    s.power = place(Blocks.powerSource, a.x, a.y);
    s.tower = place(modBlock("chrono-build-tower"), a.x + 1, a.y);
    s.tx = a.x + 4; s.ty = a.y;
    s.wall = place(Blocks.copperWall, s.tx, s.ty);
    s.wall.kill();
    s.sawGone = false;
}, (a, s) => {
    let b = Vars.world.tile(s.tx, s.ty).build;
    let name = b == null ? "null" : b.block.name;
    let prog = b != null && b.block instanceof ConstructBlock ? " progress=" + num(b, "progress").toFixed(2) : "";
    return { pass: s.sawGone && b != null && b.block == Blocks.copperWall && b != s.wall,
             info: "tile=" + name + prog + " sawGone=" + s.sawGone + " plans=" + TEAM.data().plans.size + " eff=" + s.tower.efficiency };
}, (a, s) => {
    let b = Vars.world.tile(s.tx, s.ty).build;
    if (b == null || b != s.wall) s.sawGone = true;
});

test("booster", 6, 5, (a, s) => {
    s.power = place(Blocks.powerSource, a.x, a.y);
    s.booster = place(modBlock("chrono-booster"), a.x + 1, a.y);
    s.press = place(Blocks.graphitePress, a.x + 3, a.y);
    s.booster.items.add(Items.phaseFabric, 5);
    s.booster.items.add(Items.silicon, 5);
    s.booster.items.add(Items.copper, 3);
    s.maxTs = 0; s.trace = [];
    s.ref = place(Blocks.graphitePress, a.x + 3, a.y + 3);
    s.ref.applyBoost(2.5, 100000);
}, (a, s) => {
    let ts = num(s.press, "timeScale");
    return { pass: s.maxTs > 1.01, info: "press.timeScale=" + ts.toFixed(2) + " max=" + s.maxTs.toFixed(2) + " refApplyBoost=" + num(s.ref, "timeScale").toFixed(2)
        + " eff=" + s.booster.efficiency + " boost=" + s.booster.realBoost().toFixed(2) + " range=" + s.booster.realRange().toFixed(0) + " dst=" + s.booster.dst(s.press).toFixed(0) + " trace=" + s.trace.join(",") };
}, (a, s) => {
    let ts = num(s.press, "timeScale");
    if (ts > s.maxTs) s.maxTs = ts;
    if (ticks % 60 == 0) s.trace.push("t" + ticks + ":h" + s.booster.heat.toFixed(2) + "/c" + s.booster.charge.toFixed(0) + "/ts" + ts.toFixed(2));
});

test("buffer", 4, 1, (a, s) => {
    s.power = place(Blocks.powerSource, a.x, a.y);
    s.buffer = place(modBlock("chrono-buffer"), a.x + 1, a.y);
    s.buffer.items.add(Items.phaseFabric, 5);
    s.buffer.items.add(Items.silicon, 5);
    s.buffer.items.add(Items.copper, 3);
    s.unit = spawn(UnitTypes.dagger, TEAM, a.x + 3, a.y);
}, (a, s) => {
    let has = s.unit.hasEffect(StatusEffects.overdrive);
    let conductive = Vars.content.statusEffect("item-liquid-teleport-chrono-conductive");
    return { pass: has, info: "overdrive=" + has + " conductive=" + (conductive != null && s.unit.hasEffect(conductive)) + " eff=" + s.buffer.efficiency + " dst=" + Math.round(s.buffer.dst(s.unit)) };
});

test("debuffer", 4, 1, (a, s) => {
    s.power = place(Blocks.powerSource, a.x, a.y);
    s.debuffer = place(modBlock("chrono-debuffer"), a.x + 1, a.y);
    s.debuffer.items.add(Items.phaseFabric, 5);
    s.debuffer.items.add(Items.silicon, 5);
    s.enemy = spawn(UnitTypes.fortress, ENEMY, a.x + 3, a.y);
    s.enemy.disarmed = true;
    s.maxStatuses = 0;
    s.effects = [StatusEffects.wet, StatusEffects.burning, StatusEffects.tarred, StatusEffects.freezing, StatusEffects.electrified, StatusEffects.shocked, StatusEffects.corroded, StatusEffects.melting, StatusEffects.sapped];
}, (a, s) => {
    return { pass: s.maxStatuses >= 4, info: "maxStatuses=" + s.maxStatuses + "/" + s.effects.length + " alive=" + s.enemy.isValid() + " eff=" + s.debuffer.efficiency };
}, (a, s) => {
    if (!s.enemy.isValid()) return;
    let count = 0;
    for (let i = 0; i < s.effects.length; i++) if (s.enemy.hasEffect(s.effects[i])) count++;
    if (count > s.maxStatuses) s.maxStatuses = count;
});

test("core", 1, 1, (a, s) => {
    s.before = TEAM.cores().size;
    s.core = place(modBlock("chrono-core"), a.x, a.y);
}, (a, s) => {
    let now = TEAM.cores().size;
    return { pass: now == s.before + 1 && s.core.isValid(), info: "cores " + s.before + "->" + now };
});

// ── Long tests: checked at LONG_TICK, then again after save/stop/load ────

function drones(unitName) {
    let out = { alive: 0, mining: 0, carried: 0 };
    Groups.unit.each(cons(u => {
        if (u.type.name != "item-liquid-teleport-" + unitName || u.team != TEAM || u.dead) return;
        out.alive++;
        out.carried += u.stack.amount;
        if (u.mineTile != null) out.mining++;
    }));
    return out;
}

// cfg: { name, unitName, size, offset, cap, minUnits, titanium, silicon, thorium, graphite }
// Upgrades applied: cap L1, mine L1+L2, tier L1 -> levels "1,0,2,0,1".
function outpostTest(cfg) {
    const name = cfg.name;
    test(name, cfg.size + 2, cfg.size + 2, (a, s) => {
        s.outpost = place(modBlock(name), a.x + cfg.offset, a.y + cfg.offset);
        const core = TEAM.core();
        core.items.add(Items.titanium, 500);
        core.items.add(Items.silicon, 500);
        core.items.add(Items.thorium, 500);
        core.items.add(Items.graphite, 500);
        s.copper0 = core.items.get(Items.copper);
        s.ti0 = core.items.get(Items.titanium);
        s.si0 = core.items.get(Items.silicon);
        s.th0 = core.items.get(Items.thorium);
        s.gr0 = core.items.get(Items.graphite);
        s.outpost.configured(null, Items.copper);
        s.outpost.configured(null, jint(0));
        s.outpost.configured(null, jint(2));
        s.outpost.configured(null, jint(2));
        s.outpost.configured(null, jint(4));
        s.spent = core.items.get(Items.titanium) == s.ti0 - cfg.titanium && core.items.get(Items.silicon) == s.si0 - cfg.silicon
            && core.items.get(Items.thorium) == s.th0 - cfg.thorium && core.items.get(Items.graphite) == s.gr0 - cfg.graphite;
        s.pos = s.outpost.pos();
        s.levels = () => [0, 1, 2, 3, 4].map(p => s.outpost.levelOf(p)).join(",");
        log(name + " hasCopperOre=" + Vars.indexer.hasOre(Items.copper) + " levels=" + s.levels() + " cap=" + s.outpost.unitCap()
            + " titanium=" + s.ti0 + "->" + core.items.get(Items.titanium) + " thorium=" + s.th0 + "->" + core.items.get(Items.thorium));
    }, (a, s) => {
        const core = TEAM.core(), d = drones(cfg.unitName);
        const delivered = core.items.get(Items.copper) - s.copper0;
        const spawned = s.outpost.unitCount() >= cfg.minUnits && s.outpost.unitCount() == d.alive;
        const upgraded = s.levels() == "1,0,2,0,1" && s.outpost.unitCap() == cfg.cap && s.spent;
        s.units = s.outpost.unitCount();
        return { pass: spawned && upgraded && delivered > 0,
                 info: "units=" + s.units + "/" + s.outpost.unitCap() + " drones=" + d.alive + " mining=" + d.mining + " carried=" + d.carried
                    + " delivered=" + delivered + " levels=" + s.levels() + " upgraded=" + upgraded };
    }, (a, s) => {
        if (ticks % 300 == 0) { let d = drones(cfg.unitName); log(name + " t" + ticks + " units=" + s.outpost.unitCount() + " mining=" + d.mining + " carried=" + d.carried + " delivered=" + (TEAM.core().items.get(Items.copper) - s.copper0)); }
    }, { long: true, reload: (s) => {
        const build = Vars.world.build(s.pos);
        if (build == null || build.block.name != "item-liquid-teleport-" + name) return [{ name: "reload", pass: false, info: "build=" + build }];
        const d = drones(cfg.unitName);
        const levelsOk = [0, 1, 2, 3, 4].map(p => build.levelOf(p)).join(",") == "1,0,2,0,1" && build.selectedItem() == Items.copper;
        const adopted = build.unitCount() == s.units && d.alive == s.units;
        const reload = { name: "reload", pass: levelsOk && adopted && d.mining > 0,
            info: "levelsOk=" + levelsOk + " units=" + build.unitCount() + "/" + s.units + " drones=" + d.alive + " mining=" + d.mining };
        build.tile.remove();
        const after = drones(cfg.unitName);
        return [reload, { name: "remove", pass: after.alive == 0, info: "dronesAlive=" + after.alive }];
    } });
}

outpostTest({ name: "outpost", unitName: "outpost-drone", size: 3, offset: 2, cap: 7, minUnits: 4,
    titanium: 400, silicon: 280, thorium: 150, graphite: 100 });
outpostTest({ name: "outpost-small", unitName: "outpost-small-drone", size: 2, offset: 1, cap: 3, minUnits: 3,
    titanium: 290, silicon: 60, thorium: 0, graphite: 130 });

// ── Driver ──────────────────────────────────────────────────────────────

function setupAll() {
    for (let i = 0; i < tests.length; i++) {
        let t = tests[i];
        try {
            t.area = claimArea(t.w, t.h);
            if (t.area == null) throw "no free area";
            t.setup(t.area, t.state);
            log("setup " + t.name + " at " + t.area.x + "," + t.area.y);
        } catch (e) {
            t.error = "" + e;
            log("setup " + t.name + " ERROR " + e);
            if (e.javaException) e.javaException.printStackTrace();
        }
    }
}

function runCheck(t) {
    if (t.error != null) return { pass: false, info: "setup error: " + t.error };
    try { return t.check(t.area, t.state); }
    catch (e) { return { pass: false, info: "check error: " + e }; }
}

function checkAll(long, label) {
    let passed = 0, total = 0;
    for (let i = 0; i < tests.length; i++) {
        let t = tests[i];
        if (t.long != long) continue;
        let r = runCheck(t);
        total++;
        if (r.pass) passed++;
        log("TEST " + t.name + " " + (r.pass ? "PASS" : "FAIL") + " " + r.info);
    }
    log(label + " " + (passed == total ? "PASS" : "FAIL") + " " + passed + "/" + total);
}

function reloadAll() {
    let passed = 0, total = 0;
    for (let i = 0; i < tests.length; i++) {
        let t = tests[i];
        if (!t.reload) continue;
        let results;
        if (t.error != null) results = [{ name: "reload", pass: false, info: "setup error: " + t.error }];
        else {
            try { results = t.reload(t.state); }
            catch (e) { results = [{ name: "reload", pass: false, info: "reload error: " + e }]; }
        }
        for (let j = 0; j < results.length; j++) {
            total++;
            if (results[j].pass) passed++;
            log("TEST " + t.name + "-" + results[j].name + " " + (results[j].pass ? "PASS" : "FAIL") + " " + results[j].info);
        }
    }
    log("RESULT-RELOAD " + (passed == total ? "PASS" : "FAIL") + " " + passed + "/" + total);
}

Events.on(EventType.WorldLoadEvent, cons(() => { phase++; ticks = 0; claimed = []; log("world loaded " + Vars.state.map.name() + " phase=" + phase); }));

Events.run(EventType.Trigger.update, run(() => {
    if (ticks < 0) return;
    ticks++;
    try {
        if (phase == 2) {
            if (ticks == RELOAD_TICK) reloadAll();
            return;
        }
        if (phase != 1) return;
        if (ticks == SETUP_TICK) setupAll();
        if (ticks > SETUP_TICK && ticks < LONG_TICK && ticks % 15 == 0) pollAll();
        if (ticks == FINAL_TICK) checkAll(false, "RESULT");
        if (ticks == LONG_TICK) checkAll(true, "RESULT-LONG");
    } catch (e) {
        log("ERROR " + e);
        if (e.javaException) e.javaException.printStackTrace();
    }
}));
