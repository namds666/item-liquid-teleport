const lib = require("lib");

const BuildTurretClass = Packages.mindustry.world.blocks.defense.BuildTurret;
const Planets = Packages.mindustry.content.Planets;
const GLOBAL_RANGE = 1000000;

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

blockType.alwaysUnlocked = true;
blockType.setupRequirements(Category.effect, BuildVisibility.shown, ItemStack.with());
blockType.shownPlanets.add(Planets.serpulo);
blockType.shownPlanets.add(Planets.erekir);
blockType.size = 1;
blockType.health = 610;
blockType.range = GLOBAL_RANGE;
blockType.buildSpeed = 1.5;
blockType.buildBeamOffset = 5;
blockType.unitType = UnitTypes.block;
blockType.liquidCapacity = 0;
lib.enableAllEnvironments(blockType);

module.exports = blockType;
