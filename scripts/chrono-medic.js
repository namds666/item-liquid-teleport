
const lib = require("lib");

// ── Unit Type ─────────────────────────────────────────────────────────────────
const chronoMedic = extend(UnitType, "chrono-medic", {});

chronoMedic.flying         = true;
chronoMedic.speed          = 7;       // ~2× faster than mono/flare
chronoMedic.accel          = 0.08;
chronoMedic.drag           = 0.05;
chronoMedic.rotateSpeed    = 20;
chronoMedic.health         = 200;
chronoMedic.hitSize        = 8;
chronoMedic.engineOffset   = 4;
chronoMedic.engineSize     = 2;
chronoMedic.itemCapacity   = 0;
chronoMedic.alwaysUnlocked = true;
chronoMedic.envDisabled    = 0;
chronoMedic.weapons        = new Seq();   // pure healer, no weapons
chronoMedic.constructor    = UnitTypes.mono.constructor;

// ── Healing: 200 hp/s (20 hp per 6 ticks, 80 px ≈ 5 tile radius) ─────────────
chronoMedic.abilities.add(new RepairFieldAbility(20, 6, 80));

// ── Seek-and-Heal AI ──────────────────────────────────────────────────────────
// Override updateUnit() fully so FlyingAI's own movement loop can't interfere.
const MedicAI = extend(FlyingAI, {
    healTarget: null,
    seekTimer:  30,   // start at 30 so the first scan fires immediately

    updateUnit() {
        const unit = this.unit;

        // Rescan for nearest injured ally every 30 ticks (~0.5 s)
        this.seekTimer += Time.delta;
        if (this.seekTimer >= 30) {
            this.seekTimer = 0;
            var best = null, bestDst = 99999;
            Groups.unit.each(other => {
                if (other !== unit && other.team == unit.team && !other.dead && other.damaged()) {
                    var d = unit.dst(other);
                    if (d < bestDst) { bestDst = d; best = other; }
                }
            });
            this.healTarget = best;
        }

        const t = this.healTarget;
        if (t !== null && !t.dead) {
            const dx = t.x - unit.x;
            const dy = t.y - unit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 40) {
                // Smoothly accelerate toward target (mirrors FlyingAI.moveAt internals)
                const spd = unit.speed();
                unit.vel.add(
                    (dx / dist * spd - unit.vel.x) * unit.type.accel,
                    (dy / dist * spd - unit.vel.y) * unit.type.accel
                );
                unit.rotation = Mathf.slerpDelta(
                    unit.rotation,
                    Mathf.angle(dx, dy),
                    unit.type.rotateSpeed * Time.delta / 45
                );
            }
        }
    }
});

chronoMedic.defaultController = prov(() => new MedicAI());

// ── Block player takeover every tick ─────────────────────────────────────────
Events.run(Trigger.update, () => {
    if (!Vars.state.isGame()) return;
    Groups.unit.each(u => {
        if (u.type === chronoMedic && !u.dead && u.isPlayer()) {
            u.resetController();
        }
    });
});

// ── Register in Air Factory ───────────────────────────────────────────────────
// Deferred to ClientLoadEvent because factory.plans is empty during script init.
Events.on(EventType.ClientLoadEvent, cons(e => {
    try {
        const factory = Blocks.airFactory;
        if (factory && factory.plans && factory.plans.size > 0) {
            const plan      = factory.plans.first().getClass().newInstance();
            plan.unit         = chronoMedic;
            plan.time         = 1200;   // 20 seconds
            plan.requirements = ItemStack.with(Items.copper, 75, Items.titanium, 25);
            factory.plans.add(plan);
        }
    } catch(err) {
        Log.warn("[chrono-medic] Failed to add to air factory: " + err);
    }
}));

module.exports = chronoMedic;
