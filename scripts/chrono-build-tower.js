
const lib = require("lib");

// ── Constants (mirrors MendProjector defaults) ─────────────────────────────
const RANGE_TILES  = 100;    // tiles (vanilla MendProjector ≈ 7.5 tiles)
const HEAL_PERCENT = 12;     // % of max health healed per pulse
const RELOAD       = 250;    // ticks between pulses (~4.2 s, same as vanilla)

// ── Block definition ───────────────────────────────────────────────────────
const chronoBuildTower = extend(Block, "chrono-build-tower", {
    load() {
        this.super$load();
        if (Vars.headless) return;
        // @-top region, same convention as MendProjector
        this.topRegion = lib.loadRegion("chrono-build-tower-top");
    },

    setStats() {
        this.super$setStats();
        this.stats.add(Stat.range, RANGE_TILES, StatUnit.blocks);
        this.stats.add(Stat.repairTime, (100 / HEAL_PERCENT * RELOAD / 60) | 0, StatUnit.seconds);
    },

    drawPlace(x, y, rotation, valid) {
        this.super$drawPlace(x, y, rotation, valid);
        if (!Vars.headless) {
            Drawf.dashCircle(
                x * Vars.tilesize, y * Vars.tilesize,
                RANGE_TILES * Vars.tilesize,
                Pal.heal
            );
        }
    }
});

// ── Properties ─────────────────────────────────────────────────────────────
chronoBuildTower.size            = 1;
chronoBuildTower.health          = 80;
chronoBuildTower.update          = true;
chronoBuildTower.solid           = true;
chronoBuildTower.buildVisibility = BuildVisibility.shown;
chronoBuildTower.alwaysUnlocked  = true;
chronoBuildTower.category        = Category.effect;
chronoBuildTower.requirements    = ItemStack.with(Items.copper, 25);
try { chronoBuildTower.envEnabled = Packages.mindustry.type.Env.terrestrial; } catch(e) {}

// ── Build type (mirrors MendBuild) ─────────────────────────────────────────
chronoBuildTower.buildType = prov(() => extend(Building, {
    heat:   0,
    charge: 0,   // randomised in created() so towers don't all pulse at once

    created() {
        this.super$created();
        this.charge = Math.random() * RELOAD;
    },

    updateTile() {
        // Always warm — no power gate
        this.heat   = Mathf.lerpDelta(this.heat, 1, 0.08);
        this.charge += this.heat * Time.delta;

        if (this.charge < RELOAD) return;
        this.charge = 0;

        const rangePx = RANGE_TILES * Vars.tilesize;

        try {
            Vars.indexer.eachBlock(
                this,
                rangePx,
                b => b.damaged() && !b.isHealSuppressed(),
                b => {
                    b.heal(b.maxHealth * HEAL_PERCENT / 100.0);
                    b.recentlyHealed();
                    try { Fx.healBlockFull.at(b.x, b.y, b.block.size, Pal.heal, b.block); } catch(fe) {}
                }
            );
        } catch(e) {}
    },

    drawSelect() {
        if (Vars.headless) return;
        Drawf.dashCircle(this.x, this.y, RANGE_TILES * Vars.tilesize, Pal.heal);
    },

    draw() {
        this.super$draw();  // draws main body region

        if (Vars.headless) return;

        // Pulsing top sprite — mirrors MendProjector.draw()
        const f = 1 - (Time.time / 100) % 1;
        Draw.color(Pal.heal);
        Draw.alpha(this.heat * Mathf.absin(Time.time, 50 / Mathf.PI2, 1) * 0.5);
        if (chronoBuildTower.topRegion && chronoBuildTower.topRegion.found()) {
            Draw.rect(chronoBuildTower.topRegion, this.x, this.y);
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

module.exports = chronoBuildTower;
