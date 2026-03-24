
const lib = require("lib");

const RANGE_TILES   = 100;   // tiles
const REPAIR_SPEED  = 10;    // hp/s for healing; build fraction/s for construction
const SCAN_INTERVAL = 5;     // ticks between scans (every 5 ticks ≈ 12×/s)

// ── Block ──────────────────────────────────────────────────────────────────
const chronoBuildTower = extend(Block, "chrono-build-tower", {
    load() {
        this.super$load();
        if (Vars.headless) return;
        this.baseRegion = lib.loadRegion("chrono-build-tower-base");
        this.glowRegion = lib.loadRegion("chrono-build-tower-glow");
    },

    setStats() {
        this.super$setStats();
        this.stats.add(Stat.range, RANGE_TILES, StatUnit.blocks);
    },

    drawPlace(x, y, rotation, valid) {
        this.super$drawPlace(x, y, rotation, valid);
        if (!Vars.headless) {
            Drawf.dashCircle(
                x * Vars.tilesize, y * Vars.tilesize,
                RANGE_TILES * Vars.tilesize,
                Pal.accent
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

// ── Build type ─────────────────────────────────────────────────────────────
chronoBuildTower.buildType = prov(() => extend(Building, {
    scanTimer: 0,

    updateTile() {
        this.scanTimer += Time.delta;
        if (this.scanTimer < SCAN_INTERVAL) return;
        this.scanTimer = 0;

        const self    = this;
        const rangePx = RANGE_TILES * Vars.tilesize;
        // Amount to apply per scan (scaled to scan interval so effective rate = REPAIR_SPEED)
        const amount  = REPAIR_SPEED / 60 * SCAN_INTERVAL;

        Groups.build.each(bld => {
            if (bld.team !== self.team || bld === self) return;
            if (self.dst(bld) > rangePx) return;

            // Detect ConstructBuild by class name (duck-type, no import needed)
            try {
                if (bld.getClass().getName().indexOf("ConstructBuild") >= 0) {
                    bld.progress = Math.min(bld.progress + amount, 1.0);
                    return;
                }
            } catch(e) {}

            if (bld.damaged && bld.damaged()) {
                bld.heal(amount * 60); // heal in hp (amount is fraction/s * s → hp)
            }
        });
    },

    draw() {
        if (!Vars.headless && chronoBuildTower.baseRegion) {
            Draw.rect(chronoBuildTower.baseRegion, this.x, this.y);
        }
        this.super$draw();
        if (!Vars.headless && chronoBuildTower.glowRegion) {
            Draw.color(Color.white, 0.6);
            Draw.rect(chronoBuildTower.glowRegion, this.x, this.y);
            Draw.color();
        }
    }
}));

module.exports = chronoBuildTower;
