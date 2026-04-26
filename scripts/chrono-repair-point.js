const cfg = {
    size: 1,
    health: 40,
    repairPercentPerSecond: 50,
    powerUse: 1,
    beamWidth: 0.7,
    rotateSpeed: 360,
    shootCone: 30
};

const chronoRepairPoint = extend(Block, "chrono-repair-point", {
    setStats() {
        this.super$setStats();
        try {
            this.stats.remove(Stat.range);
        } catch (e) {}
        this.stats.add(Stat.range, "Global");
    },
    drawPlace(x, y, rotation, valid) {
        this.super$drawPlace(x, y, rotation, valid);
    }
});

chronoRepairPoint.size = cfg.size;
chronoRepairPoint.health = cfg.health;
chronoRepairPoint.repairPercentPerSecond = cfg.repairPercentPerSecond;
chronoRepairPoint.beamWidth = cfg.beamWidth;
chronoRepairPoint.rotateSpeed = cfg.rotateSpeed;
chronoRepairPoint.shootCone = cfg.shootCone;
chronoRepairPoint.update = true;
chronoRepairPoint.solid = true;
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

    canHealUnit(u) {
        if (!u || u.team != this.team || !u.damaged()) return false;
        return typeof u.isHealSuppressed !== "function" || !u.isHealSuppressed();
    },

    maxHealthOf(u) {
        if (!u) return 0;
        if (typeof u.maxHealth === "function") return u.maxHealth();
        if (u.maxHealth != null) return u.maxHealth;
        return u.type != null && u.type.health != null ? u.type.health : 0;
    },

    findTarget() {
        let closest = null, closestDst2 = Number.MAX_VALUE;
        Groups.unit.each(cons(u => {
            if (!this.canHealUnit(u)) return;
            let dst2 = this.dst2(u);
            if (dst2 < closestDst2) {
                closest = u;
                closestDst2 = dst2;
            }
        }));
        return closest;
    },

    updateTile() {
        if (this.target == null || !this.target.isValid() || !this.canHealUnit(this.target)) {
            this.target = this.findTarget();
        }

        let active = false;
        if (this.target != null && this.efficiency > 0) {
            let angle = Angles.angle(this.x, this.y, this.target.x, this.target.y);
            this.rotation = Angles.moveToward(this.rotation, angle, chronoRepairPoint.rotateSpeed * this.edelta());

            if (Angles.within(this.rotation, angle, chronoRepairPoint.shootCone)) {
                let amount = this.maxHealthOf(this.target) * chronoRepairPoint.repairPercentPerSecond / 100 / 60 * this.edelta();
                this.target.heal(amount);
                if (typeof this.target.recentlyHealed === "function") this.target.recentlyHealed();
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

module.exports = chronoRepairPoint;
