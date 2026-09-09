const TAG = "[HARNESS]";
const TEAM = Team.sharded;
const SETUP_TICK = 30;
const CHECK_TICKS = [60, 180, 360];
const DAMAGE_FRACTION = 0.1;

const TARGET_BLOCKS = () => [
    Blocks.copperWall, Blocks.conveyor, Blocks.sorter, Blocks.duo, Blocks.container
];

let ticks = -1;
let mender = null;
let targets = [];

function log(s) { Log.info(TAG + " " + s); }
function maxHp(b) { return typeof b.maxHealth === "function" ? b.maxHealth() : b.maxHealth; }

function tileFree(t) {
    return t != null && t.build == null && t.block() == Blocks.air && !t.floor().isLiquid && !t.floor().isDeep();
}

function freeStrip(len) {
    const core = TEAM.core();
    if (core == null) { log("no core for " + TEAM); return null; }
    const cx = core.tile.x, cy = core.tile.y;
    for (let r = 6; r < 60; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) != r && Math.abs(dy) != r) continue;
                let ok = true;
                for (let i = 0; i < len && ok; i++) {
                    ok = tileFree(Vars.world.tile(cx + dx + i, cy + dy)) && tileFree(Vars.world.tile(cx + dx + i, cy + dy + 1));
                }
                if (ok) return Vars.world.tile(cx + dx, cy + dy);
            }
        }
    }
    return null;
}

function place(block, x, y) {
    const t = Vars.world.tile(x, y);
    t.setBlock(block, TEAM, 0);
    let b = t.build;
    if (b == null || b.block != block) log("FAILED to place " + block.name + " at " + x + "," + y + " got " + (b == null ? "null" : b.block.name));
    return b;
}

function setup() {
    const menderBlock = Vars.content.block("item-liquid-teleport-chrono-mender");
    if (menderBlock == null) { log("FAIL: chrono-mender block not found (mod not loaded?)"); return; }
    const blocks = TARGET_BLOCKS();
    const origin = freeStrip(2 + blocks.length * 3);
    if (origin == null) { log("FAIL: no free strip near core"); return; }
    const x0 = origin.x, y0 = origin.y;
    mender = place(menderBlock, x0, y0);
    targets = [];
    for (let i = 0; i < blocks.length; i++) {
        let b = place(blocks[i], x0 + 3 + i * 3, y0);
        if (b == null) continue;
        b.health = maxHp(b) * DAMAGE_FRACTION;
        targets.push(b);
    }
    log("setup at " + x0 + "," + y0 + " map=" + Vars.state.map.name() + " mender=" + (mender != null) + " targets=" + targets.length);
    report("t0");
}

function inTeamSeq(b) {
    const seq = TEAM.data().buildings;
    const items = seq.items;
    for (let i = 0; i < seq.size; i++) if (items[i] == b) return true;
    return false;
}

function report(tag) {
    if (mender == null) { log(tag + " mender missing"); return; }
    log(tag + " tick=" + ticks + " playing=" + Vars.state.isPlaying() + " menderValid=" + mender.isValid()
        + " team=" + mender.team + " eff=" + mender.efficiency + " enabled=" + mender.enabled
        + " heat=" + mender.heat + " charge=" + mender.charge + " inTeamSeq=" + inTeamSeq(mender)
        + " teamSeqSize=" + TEAM.data().buildings.size + " groupsBuild=" + Groups.build.size());
    for (let i = 0; i < targets.length; i++) {
        let b = targets[i];
        log(tag + "   " + b.block.name + " hp=" + Math.round(b.health) + "/" + maxHp(b)
            + " damaged=" + b.damaged() + " suppressed=" + b.isHealSuppressed()
            + " inTeamSeq=" + inTeamSeq(b) + " valid=" + b.isValid());
    }
}

function probe(label, fn) {
    try { log("PROBE ok   " + label + " -> " + fn()); }
    catch (e) { log("PROBE FAIL " + label + " -> " + e); }
}

function probeApi() {
    if (mender == null || targets.length == 0) return;
    const t = mender.tile;
    const core = TEAM.core();
    const conveyor = targets[1];
    let unit = null;
    try { unit = UnitTypes.dagger.spawn(TEAM, mender.x, mender.y - 24); } catch (e) { log("PROBE spawn unit failed " + e); }
    probe("Building.maxHealth()", () => mender.maxHealth());
    probe("Building.maxHealth",   () => mender.maxHealth);
    probe("Building.health()",    () => mender.health());
    probe("Building.team()",      () => mender.team());
    probe("Building.timer(0,10)", () => mender.timer(0, 10));
    probe("Building.timer.get",   () => mender.timer.get(0, 10));
    probe("Building.timeScale()", () => mender.timeScale());
    probe("Building.delta()",     () => mender.delta());
    probe("Building.dead()",      () => mender.dead());
    probe("Tile.floor()",         () => t.floor());
    probe("Tile.block()",         () => t.block());
    probe("Tile.overlay()",       () => t.overlay());
    probe("Tile.build",           () => t.build);
    probe("ItemModule.total()",   () => core.items.total());
    probe("ItemModule.empty()",   () => core.items.empty());
    probe("ItemModule.any()",     () => core.items.any());
    probe("ConveyorBuild.next()", () => conveyor.next());
    probe("ConveyorBuild.next",   () => conveyor.next);
    probe("Block.requirements()", () => Blocks.copperWall.requirements());
    probe("Block.unlocked()",     () => Blocks.copperWall.unlocked());
    probe("Floor.edge()",         () => t.floor().edge());
    probe("Team.data()",          () => TEAM.data());
    probe("Seq.size",             () => TEAM.data().buildings.size);
    if (unit != null) {
        probe("Unit.maxHealth()", () => unit.maxHealth());
        probe("Unit.type()",      () => unit.type());
        probe("Unit.type",        () => unit.type);
        probe("Unit.team()",      () => unit.team());
        probe("Unit.health()",    () => unit.health());
        probe("Unit.dead()",      () => unit.dead());
        probe("Unit.hitSize()",   () => unit.hitSize());
        probe("Unit.isShooting()",() => unit.isShooting());
        probe("Unit.hasTarget()", () => unit.hasTarget());
        probe("Unit.shield()",    () => unit.shield());
        probe("Unit.armor()",     () => unit.armor());
        probe("Unit.rotation()",  () => unit.rotation());
        probe("Unit.controller()",() => unit.controller());
        probe("UnitType.hittable()", () => UnitTypes.dagger.hittable());
    }
}

function verdict() {
    let healed = 0;
    for (let i = 0; i < targets.length; i++) if (!targets[i].damaged()) healed++;
    log("RESULT " + (healed == targets.length && targets.length > 0 ? "PASS" : "FAIL") + " healed=" + healed + "/" + targets.length);
}

Events.on(EventType.WorldLoadEvent, cons(() => { ticks = 0; mender = null; targets = []; log("world loaded"); }));

Events.run(EventType.Trigger.update, run(() => {
    if (ticks < 0) return;
    ticks++;
    try {
        if (ticks == SETUP_TICK) { setup(); probeApi(); }
        for (let i = 0; i < CHECK_TICKS.length; i++) if (ticks == CHECK_TICKS[i]) report("t" + ticks);
        if (ticks == CHECK_TICKS[CHECK_TICKS.length - 1]) verdict();
    } catch (e) {
        log("ERROR " + e);
        if (e.javaException) e.javaException.printStackTrace();
    }
}));
