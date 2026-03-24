
const lib = require("lib");

// ── Extend vanilla BuildTower ──────────────────────────────────────────────
// BuildTower handles: scanning range for ConstructBuilds (advance progress)
// and damaged buildings (heal them). We override power away so it runs free.
const BuildTowerClass = Packages.mindustry.world.blocks.defense.BuildTower;

const chronoBuildTower = extend(BuildTowerClass, "chrono-build-tower", {
    // Override efficiency so the block always operates at 100% without power.
    // BuildTowerBuild.updateTile() multiplies repairSpeed by efficiency().
});

// ── Properties ─────────────────────────────────────────────────────────────
chronoBuildTower.size            = 1;       // 1×1 (vanilla: 3×3)
chronoBuildTower.health          = 80;
chronoBuildTower.range           = 100;     // 100 tiles (vanilla: 25)
chronoBuildTower.repairSpeed     = 10;      // same as vanilla (10 hp/s, 10%/s build)
chronoBuildTower.buildVisibility = BuildVisibility.shown;
chronoBuildTower.alwaysUnlocked  = true;
chronoBuildTower.category        = Category.effect;
chronoBuildTower.requirements    = ItemStack.with(Items.copper, 25);

// Remove power requirement added by BuildTower's constructor.
chronoBuildTower.hasPower  = false;
chronoBuildTower.consPower = null;
try { chronoBuildTower.consumers.clear(); } catch(e) {}

// Restrict to Serpulo and Erekir (both terrestrial) — excludes space/void stages.
chronoBuildTower.envEnabled = Packages.mindustry.type.Env.terrestrial;

// BuildTower.updateTile checks efficiency(); with hasPower=false the
// Building base class returns 1.0 (full), so the block works at full speed.

module.exports = chronoBuildTower;
