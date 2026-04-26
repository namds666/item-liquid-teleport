const cfg = {
    size: 1,
    health: 40,
    range: 0,
    trackingRange: 0,
    repairSpeed: 27 / 60,
    powerUse: 1,
    beamWidth: 0.7,
    rotateSpeed: 360,
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
        this.stats.add(Stat.range, "Global");
    },
    drawPlace(x, y, rotation, valid) {
        // Keep the vanilla placement sprite but skip the enormous global range circle.
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

chronoRepairPoint.buildType = prov(() => extend(Building, {
    target: null,
    strength: 0,
    rotation: 90,

    range() { return Number.MAX_VALUE; },

    findTarget() {
        let closest = null, closestDst2 = Number.MAX_VALUE;
        Groups.unit.each(cons(u => {
            if (!u || u.team != this.team || !u.damaged() || u.isHealSuppressed()) return;
            let dst2 = this.dst2(u);
            if (dst2 < closestDst2) {
                closest = u;
                closestDst2 = dst2;
            }
        }));
        return closest;
    },

    updateTile() {
        if (this.target == null || !this.target.isValid() || this.target.team != this.team || !this.target.damaged() || this.target.isHealSuppressed()) {
            this.target = this.findTarget();
        }

        let active = false;
        if (this.target != null && this.efficiency > 0) {
            let angle = Angles.angle(this.x, this.y, this.target.x, this.target.y);
            this.rotation = Angles.moveToward(this.rotation, angle, chronoRepairPoint.rotateSpeed * this.edelta());

            if (Angles.within(this.rotation, angle, chronoRepairPoint.shootCone)) {
                let amount = chronoRepairPoint.repairSpeed * this.edelta();
                this.target.heal(amount);
                this.target.recentlyHealed();
                active = true;

                if (!this.target.damaged()) this.target = this.findTarget();
            }
        }

        this.strength = Mathf.lerpDelta(this.strength, active ? 1 : 0, 0.08);
    },

    draw() {
        this.super$draw();

        if (this.target != null && this.strength > 0.001 && !Vars.headless) {
            Draw.z(Layer.bullet);
            Draw.color(Pal.heal);
            Lines.stroke(chronoRepairPoint.beamWidth * this.strength);
            Lines.line(this.x, this.y, this.target.x, this.target.y);
            Fill.circle(this.target.x, this.target.y, 2.5 * this.strength);
            Draw.reset();
        }
    },

    drawSelect() {
        // Global range is intentionally not drawn.
    },

    buildRotation() { return this.rotation; },
    shouldConsume() { return this.target != null; },
    status() { return this.target == null ? BlockStatus.noInput : this.super$status(); },
}));

try { chronoRepairPoint.envEnabled = Packages.mindustry.type.Env.terrestrial; } catch (e) {}

module.exports = chronoRepairPoint;
