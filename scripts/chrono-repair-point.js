const RANGE = 1200;
const POWER_USE = 1;
const REPAIR_SPEED = 27 / 60;

const chronoRepairPoint = extend(RepairTurret, "chrono-repair-point", {});

chronoRepairPoint.size = 1;
chronoRepairPoint.health = 40;
chronoRepairPoint.range = RANGE;
chronoRepairPoint.repairSpeed = REPAIR_SPEED;
chronoRepairPoint.buildVisibility = BuildVisibility.shown;
chronoRepairPoint.alwaysUnlocked = true;
chronoRepairPoint.category = Category.units;
chronoRepairPoint.requirements = ItemStack.with(
    Items.copper, 30,
    Items.lead, 30,
    Items.silicon, 20
);
chronoRepairPoint.consumePower(POWER_USE);

try { chronoRepairPoint.envEnabled = Packages.mindustry.type.Env.terrestrial; } catch (e) {}

module.exports = chronoRepairPoint;
