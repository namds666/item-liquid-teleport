
const lib = require("lib");

// ── Config ─────────────────────────────────────────────────────────────────
const HEAL_PERCENT = 50;   // % of max health healed per pulse (insane)
const RELOAD       = 10;    // ticks between pulses (0.5 s — fully heals twice/sec)

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
        this.charge += this.heat * Time.delta;

        if (this.charge < RELOAD) return;
        this.charge = 0;

        try {
            Groups.build.each(cons(b => {
                if (!b || b.team != this.team || !b.damaged() || b.isHealSuppressed()) return;
                b.heal(b.maxHealth * HEAL_PERCENT / 100.0);
                b.recentlyHealed();
                try { Fx.healBlockFull.at(b.x, b.y, b.block.size, Pal.heal, b.block); } catch(fe) {}
            }));
        } catch(e) {}
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
