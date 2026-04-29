
const lib = require("lib");

// ── Config ─────────────────────────────────────────────────────────────────
const HEAL_PERCENT = 50;   // % of max health healed per pulse (insane)
const RELOAD       = 10;    // ticks between pulses (0.5 s — fully heals twice/sec)
const MAX_EFFECTS_PER_PULSE = 24;
const nextPulseByTeam = {};

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
    if (typeof b.maxHealth === "function") return b.maxHealth();
    if (b.maxHealth != null) return b.maxHealth;
    return b.block != null && b.block.health != null ? b.block.health : 0;
}

function canHealBuilding(b, team) {
    if (!b || b.team != team) return false;

    let maxHealth = maxHealthOf(b);
    if (maxHealth <= 0) return false;
    if (b.health != null) return b.health < maxHealth - 0.001;
    return typeof b.damaged === "function" && b.damaged();
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

        let effectsLeft = MAX_EFFECTS_PER_PULSE;
        Groups.build.each(cons(b => {
            if (!canHealBuilding(b, this.team)) return;

            let maxHealth = maxHealthOf(b);
            b.heal(maxHealth * HEAL_PERCENT / 100.0);
            if (typeof b.recentlyHealed === "function") b.recentlyHealed();

            if (effectsLeft-- > 0 && b.block != null) {
                Fx.healBlockFull.at(b.x, b.y, b.block.size, Pal.heal, b.block);
            }
        }));
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

module.exports = chronoMender;
