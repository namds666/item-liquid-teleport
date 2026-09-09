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
        if (ticks == SETUP_TICK) setup();
        for (let i = 0; i < CHECK_TICKS.length; i++) if (ticks == CHECK_TICKS[i]) report("t" + ticks);
        if (ticks == CHECK_TICKS[CHECK_TICKS.length - 1]) verdict();
    } catch (e) {
        log("ERROR " + e);
        if (e.javaException) e.javaException.printStackTrace();
    }
}));
