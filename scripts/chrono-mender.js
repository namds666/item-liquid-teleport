
const lib = require("lib");

// ── Config ─────────────────────────────────────────────────────────────────
const HEAL_PERCENT          = 50;   // % of max health healed per pulse (insane)
const RELOAD                = 10;   // ticks between pulses (0.5 s — fully heals twice/sec)
const MAX_EFFECTS_PER_PULSE = 24;
const MAX_HEALS_PER_PULSE   = 512;  // buildings inspected per pulse
const nextPulseByTeam = {};
const nextIndexByTeam = {};
let errored = false;

function teamKey(team) {
    return team == null ? -1 : team.id;
}

function takeTeamPulse(team) {
    let key = teamKey(team);
    let now = Time.time;
    let next = nextPulseByTeam[key];
    if (next != null && now < next && next - now <= RELOAD * 2) return false;

    nextPulseByTeam[key] = now + RELOAD;
    return true;
}

function maxHealthOf(b) {
    if (!b) return 0;
    return b.maxHealth();
}

function canHealBuilding(b) {
    if (!b) return false;
    if (!b.damaged()) return false;
    if (b.isHealSuppressed()) return false;
    return maxHealthOf(b) > 0;
}

// ── Block definition ───────────────────────────────────────────────────────
const chronoMender = extend(Block, "chrono-mender", {
    load() {
        this.super$load();
        if (Vars.headless) return;
        this.topRegion = lib.loadRegion("chrono-mender-top");
    },

    setStats() {
        this.super$setStats();
        this.stats.add(Stat.repairTime, (100 / HEAL_PERCENT * RELOAD / 60) | 0, StatUnit.seconds);
    }
});

// ── Properties ─────────────────────────────────────────────────────────────
chronoMender.size            = 1;
chronoMender.health          = 8000;
chronoMender.update          = true;
chronoMender.solid           = true;
chronoMender.buildVisibility = BuildVisibility.shown;
chronoMender.alwaysUnlocked  = true;
chronoMender.category        = Category.effect;
chronoMender.requirements    = ItemStack.with();
lib.enableAllEnvironments(chronoMender);

// ── Build type ─────────────────────────────────────────────────────────────
chronoMender.buildType = prov(() => extend(Building, {
    heat:   0,
    charge: 0,

    created() {
        this.super$created();
        this.charge = Math.random() * RELOAD;
    },

    updateTile() {
        this.heat   = Mathf.lerpDelta(this.heat, 1, 0.08);
        this.charge = Math.min(this.charge + this.heat * Time.delta, RELOAD);

        if (this.efficiency <= 0 || !takeTeamPulse(this.team)) return;
        this.charge = 0;

        try {
            let seq = lib.teamBuildings(this.team);
            if (seq == null) return;

            let key   = teamKey(this.team);
            let items = seq.items;
            let total = seq.size;

            let start = nextIndexByTeam[key] || 0;
            if (start >= total) start = 0;
            let end = Math.min(start + MAX_HEALS_PER_PULSE, total);

            let effectsLeft = MAX_EFFECTS_PER_PULSE;
            for (let i = start; i < end; i++) {
                let b = items[i];
                if (!canHealBuilding(b)) continue;

                b.heal(b.maxHealth() * HEAL_PERCENT / 100.0);
                b.recentlyHealed();

                if (effectsLeft-- > 0 && b.block != null) {
                    Fx.healBlockFull.at(b.x, b.y, b.block.size, Pal.heal, b.block);
                }
            }

            nextIndexByTeam[key] = end;
        } catch (e) {
            if (!errored) {
                Log.err("[item-liquid-teleport] chrono-mender sweep error: @", e);
                errored = true;
            }
        }
    },

    draw() {
        this.super$draw();

        if (Vars.headless) return;

        const f = 1 - (Time.time / 100) % 1;
        Draw.color(Pal.heal);
        Draw.alpha(this.heat * Mathf.absin(Time.time, 50 / Mathf.PI2, 1) * 0.5);
        if (chronoMender.topRegion && chronoMender.topRegion.found()) {
            Draw.rect(chronoMender.topRegion, this.x, this.y);
        }
        Draw.alpha(1);
        Lines.stroke((2 * f + 0.2) * this.heat);
        Lines.square(this.x, this.y, Math.min(1 + (1 - f) * 4, 4));
        Draw.reset();
    },

    write(write) {
        this.super$write(write);
        write.f(this.heat);
        write.f(this.charge);
    },

    read(read, revision) {
        this.super$read(read, revision);
        this.heat   = read.f();
        this.charge = read.f();
    }
}));

// ── World reset ───────────────────────────────────────────────────────────
Events.on(EventType.WorldLoadEvent, cons(() => {
    for (let k in nextPulseByTeam) delete nextPulseByTeam[k];
    for (let k in nextIndexByTeam) delete nextIndexByTeam[k];
    errored = false;
}));

module.exports = chronoMender;
