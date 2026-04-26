const lib = require("lib");

const GLOBAL_RANGE = 1000000;

const blockType = extend(BuildTurret, "chrono-build-tower", {
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
blockType.size = 1;
blockType.health = 610;
blockType.range = GLOBAL_RANGE;
blockType.buildSpeed = 1.5;
blockType.buildBeamOffset = 5;
blockType.unitType = UnitTypes.block;
blockType.liquidCapacity = 0;
blockType.requirements = ItemStack.with();
lib.enableAllEnvironments(blockType);

module.exports = blockType;
