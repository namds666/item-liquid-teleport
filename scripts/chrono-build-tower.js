const lib = require("lib");

const BuildTurretClass = Packages.mindustry.world.blocks.defense.BuildTurret;
const ConstructBlockClass = Packages.mindustry.world.blocks.ConstructBlock;
const BuildClass = Packages.mindustry.world.Build;
const GLOBAL_RANGE = 1000000;
const IDLE_SCAN_INTERVAL = 15;

function planQueue(unit) {
    return typeof unit.plans === "function" ? unit.plans() : unit.plans;
}

function towerUnit(tower) {
    return typeof tower.unit === "function" ? tower.unit() : tower.unit;
}

function planBuildable(team, plan) {
    let tile = plan.tile();
    if (tile == null) return false;
    let build = tile.build;
    if (build != null && build.block instanceof ConstructBlockClass) {
        return build.team == team && (plan.breaking || build.current == plan.block);
    }
    return plan.breaking
        ? BuildClass.validBreak(team, plan.x, plan.y)
        : BuildClass.validPlace(plan.block, team, plan.x, plan.y, plan.rotation);
}

function claimedByOtherTower(towers, self, plan) {
    for (let i = 0; i < towers.size; i++) {
        let tower = towers.get(i);
        if (tower.pos() == self.pos()) continue;
        let current = towerUnit(tower).buildPlan();
        if (current != null && current.samePos(plan)) return true;
    }
    return false;
}

// Vanilla BuildTurret copies the current plan of a nearby builder, so every tower works on the same block.
// Each Chrono Build Tower takes its own plan from the team builders' queues instead.
function findFreePlan(self) {
    let data = self.team.data();
    let towers = data.getBuildings(self.block);
    let units = data.units;
    for (let i = 0; i < units.size; i++) {
        let unit = units.get(i);
        if (!unit.canBuild()) continue;
        let queue = planQueue(unit);
        for (let j = 0; j < queue.size; j++) {
            let plan = queue.get(j);
            if (plan.x == self.tileX() && plan.y == self.tileY()) continue;
            if (planBuildable(self.team, plan) && !claimedByOtherTower(towers, self, plan)) return plan;
        }
    }
    return null;
}

const blockType = extend(BuildTurretClass, "chrono-build-tower", {
    load() {
        this.super$load();
        if (Vars.headless) return;
        this.region = lib.loadRegion("chrono-build-tower");
        this.baseRegion = lib.loadRegion("chrono-build-tower-base");
        this.glowRegion = lib.loadRegion("chrono-build-tower-glow");
    },

    setStats() {
        this.super$setStats();
        try {
            this.stats.remove(Stat.range);
        } catch (e) {}
        this.stats.add(Stat.range, "Global");
    },

    drawPlace(x, y, rotation, valid) {}
});

blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked = true;
blockType.category = Category.effect;
blockType.requirements = ItemStack.with();
blockType.size = 1;
blockType.health = 610;
blockType.range = GLOBAL_RANGE;
blockType.buildSpeed = 50;
blockType.buildBeamOffset = 5;
blockType.unitType = UnitTypes.block;
blockType.liquidCapacity = 0;
lib.enableAllEnvironments(blockType);

blockType.buildType = prov(() => {
    let idleTimer = 0;

    return new JavaAdapter(BuildTurretClass.BuildTurretBuild, {
        updateTile() {
            if (!this.isControlled()) {
                this.following = null;
                let unit = towerUnit(this);
                if (unit.buildPlan() == null) {
                    idleTimer -= Time.delta;
                    if (idleTimer <= 0) {
                        let plan = findFreePlan(this);
                        if (plan == null) {
                            idleTimer = IDLE_SCAN_INTERVAL;
                        } else {
                            let copy = plan.copy();
                            copy.initialized = false;
                            unit.addBuild(copy);
                        }
                    }
                }
            }
            this.super$updateTile();
        }
    }, blockType);
});

module.exports = blockType;
