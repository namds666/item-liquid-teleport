
const lib = require("lib");

// ── Unit Type ─────────────────────────────────────────────────────────────────
const chronoMedic = extend(UnitType, "chrono-medic", {});

// ── Stats ─────────────────────────────────────────────────────────────────────
chronoMedic.flying        = true;
chronoMedic.speed         = 7;     // Very fast (mono ≈ 3, flare ≈ 3.5)
chronoMedic.accel         = 0.08;
chronoMedic.drag          = 0.05;
chronoMedic.rotateSpeed   = 20;
chronoMedic.health        = 200;
chronoMedic.hitSize       = 8;
chronoMedic.engineOffset  = 4;
chronoMedic.engineSize    = 2;
chronoMedic.itemCapacity  = 0;
chronoMedic.alwaysUnlocked = true;
chronoMedic.envDisabled   = 0;     // Works on all terrain types
chronoMedic.weapons       = new Seq();  // Pure healer — no weapons

// ── Healing: 200 hp/s ─────────────────────────────────────────────────────────
// RepairFieldAbility(healAmount, reloadTicks, range)
// 20 hp per 6 ticks × 10 = 200 hp/s, range 80 px ≈ 5 tiles
chronoMedic.abilities.add(new RepairFieldAbility(20, 6, 80));

// ── Seek-and-Heal AI ──────────────────────────────────────────────────────────
// Overrides updateMovement() so FlyingAI still handles rotation and weapon updates.
const MedicAI = extend(FlyingAI, {
    healTarget: null,
    seekTimer:  0,

    updateMovement() {
        const unit = this.unit;

        // Rescan for nearest damaged friendly unit every 30 ticks (~0.5 s)
        this.seekTimer += Time.delta;
        if (this.seekTimer >= 30) {
            this.seekTimer = 0;
            let best    = null;
            let bestDst = 99999;
            Groups.unit.each(u => {
                if (u !== unit && u.team == unit.team && !u.dead && u.damaged()) {
                    const d = unit.dst(u);
                    if (d < bestDst) { bestDst = d; best = u; }
                }
            });
            this.healTarget = best;
        }

        // Fly toward the target; hover at 40 px so the heal field covers it
        if (this.healTarget !== null && !this.healTarget.dead) {
            this.moveTo(this.healTarget, 40);
        }
    }
});

chronoMedic.defaultController = prov(() => new MedicAI());

// ── Add to Air Factory (alongside Mono and Flare) ────────────────────────────
try {
    const factory = Blocks.airFactory;
    if (factory && factory.plans && factory.plans.size > 0) {
        // Grab UnitPlan class from an existing plan and use its no-arg constructor
        const plan      = factory.plans.first().getClass().newInstance();
        plan.unit         = chronoMedic;
        plan.time         = 1200;  // 20 seconds
        plan.requirements = ItemStack.with(Items.copper, 75, Items.titanium, 25);
        factory.plans.add(plan);
    }
} catch(e) {
    Log.warn("[chrono-medic] Failed to add to air factory: " + e);
}

module.exports = chronoMedic;
