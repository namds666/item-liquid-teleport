const cfg = {
    size: 1,
    health: 40,
    range: 1200,
    trackingRange: 1200,
    repairSpeed: 27 / 60,
    powerUse: 1,
    beamWidth: 0.7,
    rotateSpeed: 7,
    shootCone: 30,
    coolantUse: 0,
    coolantMultiplier: 1,
    acceptCoolant: false,
    liquidCapacity: 0
};

const chronoRepairPoint = extend(RepairTurret, "chrono-repair-point", {
    setStats() {
        this.super$setStats();
        try {
            this.stats.remove(Stat.range);
        } catch (e) {}
        this.stats.add(Stat.range, cfg.range / Vars.tilesize, StatUnit.blocks);
    },
    drawPlace(x, y, rotation, valid) {
        this.super$drawPlace(x, y, rotation, valid);
        Drawf.dashCircle(x * Vars.tilesize, y * Vars.tilesize, cfg.range, Pal.heal);
    }
});

chronoRepairPoint.size = cfg.size;
chronoRepairPoint.health = cfg.health;
chronoRepairPoint.range = cfg.range;
chronoRepairPoint.trackingRange = cfg.trackingRange;
chronoRepairPoint.repairSpeed = cfg.repairSpeed;
chronoRepairPoint.beamWidth = cfg.beamWidth;
chronoRepairPoint.rotateSpeed = cfg.rotateSpeed;
chronoRepairPoint.shootCone = cfg.shootCone;
chronoRepairPoint.coolantUse = cfg.coolantUse;
chronoRepairPoint.coolantMultiplier = cfg.coolantMultiplier;
chronoRepairPoint.acceptCoolant = cfg.acceptCoolant;
chronoRepairPoint.liquidCapacity = cfg.liquidCapacity;
chronoRepairPoint.buildVisibility = BuildVisibility.shown;
chronoRepairPoint.alwaysUnlocked = true;
chronoRepairPoint.category = Category.units;
chronoRepairPoint.requirements = ItemStack.with(
    Items.copper, 30,
    Items.lead, 30,
    Items.silicon, 20
);
chronoRepairPoint.consumePower(cfg.powerUse);

try { chronoRepairPoint.envEnabled = Packages.mindustry.type.Env.terrestrial; } catch (e) {}

module.exports = chronoRepairPoint;
