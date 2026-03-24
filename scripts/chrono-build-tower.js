
const lib = require("lib");

const RANGE_TILES   = 100;
const SCAN_INTERVAL = 5;     // ticks between scan passes

// Module-level queue: buildings destroyed within range of a chrono-build-tower.
// Filled by BlockDestroyEvent; consumed in updateTile.
const rebuildQueue = [];

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

// ── Detect destroyed buildings → queue instant rebuild ─────────────────────
// BlockDestroyEvent fires for damage-caused destruction (NOT player demolition),
// so we only auto-rebuild buildings that were killed by enemies.
Events.on(EventType.BlockDestroyEvent, cons(e => {
    if (!Vars.state.isGame()) return;
    const build = e.unit;
    if (!build || !build.team || !build.block) return;

    const rangePx = RANGE_TILES * Vars.tilesize;
    let covered = false;

    // Check whether any placed chrono-build-tower of the same team covers this tile
    Groups.build.each(tower => {
        if (covered) return;
        if (tower.block !== chronoBuildTower) return;
        if (tower.team !== build.team) return;
        if (tower.dst(build) <= rangePx) covered = true;
    });

    if (!covered) return;

    rebuildQueue.push({
        block:    build.block,
        team:     build.team,
        tileX:    build.tileX(),
        tileY:    build.tileY(),
        rotation: build.rotation | 0   // ensure int (0-3)
    });
}));

// ── Build type ─────────────────────────────────────────────────────────────
chronoBuildTower.buildType = prov(() => extend(Building, {
    scanTimer: 0,

    updateTile() {
        this.scanTimer += Time.delta;
        if (this.scanTimer < SCAN_INTERVAL) return;
        this.scanTimer = 0;

        const self    = this;
        const rangePx = RANGE_TILES * Vars.tilesize;
        // 10 hp/s heal; 10 %/s build progress (same rate as vanilla BuildTower)
        const amount  = 10 / 60 * SCAN_INTERVAL;

        // ── Heal damaged / advance under-construction buildings ──────────────
        Groups.build.each(bld => {
            if (bld.team !== self.team || bld === self) return;
            if (self.dst(bld) > rangePx) return;

            try {
                if (bld.getClass().getName().indexOf("ConstructBuild") >= 0) {
                    // Advance construction progress (0 → 1)
                    bld.progress = Math.min(bld.progress + amount, 1.0);
                    return;
                }
            } catch(err) {}

            // Repair damaged buildings at 10 hp/s (same as vanilla)
            if (bld.damaged && bld.damaged()) {
                bld.heal(amount);
            }
        });

        // ── Process rebuild queue ────────────────────────────────────────────
        // Iterate backwards so splice doesn't skip entries
        for (let i = rebuildQueue.length - 1; i >= 0; i--) {
            const info = rebuildQueue[i];
            if (info.team !== self.team) continue;

            // Check if this tower covers the rebuild site
            const bx = info.tileX * Vars.tilesize;
            const by = info.tileY * Vars.tilesize;
            if (self.dst(bx, by) > rangePx) continue;

            rebuildQueue.splice(i, 1);

            // Only place if the tile is still empty (nothing rebuilt it already)
            const tile = Vars.world.tile(info.tileX, info.tileY);
            if (tile && !tile.build) {
                tile.setNet(info.block, info.team, info.rotation);
            }
        }
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
