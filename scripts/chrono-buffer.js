const lib = require("lib");
const boostRules = require("chrono-boost-rules");

const OverdriveProjectorClass = Packages.mindustry.world.blocks.defense.OverdriveProjector;

const TILE = boostRules.TILE;
const BASE_RANGE = boostRules.BASE_RANGE;
const BASE_EFFECT = 2.5;
const BASE_USE_TIME = 600;
const APPLY_RELOAD = boostRules.APPLY_RELOAD;
const itemBoosters = boostRules.itemBoosters;
const liquidBoosters = boostRules.liquidBoosters;

function makeStatus(name, color, multipliers) {
    const status = extend(StatusEffect, name, {});
    status.color = Color.valueOf(color);
    status.effect = Fx.overdriven;
    status.effectChance = 0.08;
    status.applyEffect = Fx.overdriven;
    status.applyColor = status.color;
    if (multipliers.speed != null) status.speedMultiplier = multipliers.speed;
    if (multipliers.damage != null) status.damageMultiplier = multipliers.damage;
    if (multipliers.reload != null) status.reloadMultiplier = multipliers.reload;
    if (multipliers.health != null) status.healthMultiplier = multipliers.health;
    return status;
}

const chronoStatuses = {
    conductive: makeStatus("chrono-conductive", "f3c36b", { speed: 1.10 }),
    dense: makeStatus("chrono-dense", "8b8fa3", { health: 1.15 }),
    focus: makeStatus("chrono-focus", "a8d8ff", { damage: 1.20 }),
    precision: makeStatus("chrono-precision", "9da3ad", { reload: 1.20 }),
    slip: makeStatus("chrono-slip", "e4c98a", { speed: 1.08 }),
    ignite: makeStatus("chrono-ignite", "4a3a33", { damage: 1.25 }),
    alloyed: makeStatus("chrono-alloyed", "8aa8ff", { health: 1.30 }),
    jagged: makeStatus("chrono-jagged", "c2b7a1", { damage: 1.10 }),
    elastic: makeStatus("chrono-elastic", "d887ff", { health: 1.60 }),
    surge: makeStatus("chrono-surge", "ffe66d", { reload: 1.65 }),
    pyro: makeStatus("chrono-pyro", "ff8a3d", { damage: 1.85 }),
    blast: makeStatus("chrono-blast", "ff5d5d", { damage: 2.50 }),
    cooled: makeStatus("chrono-cooled", "6aa7ff", { reload: 1.20 }),
    molten: makeStatus("chrono-molten", "ffb45d", { damage: 1.45 }),
    lubed: makeStatus("chrono-lubed", "303030", { speed: 1.30 }),
    cryo: makeStatus("chrono-cryo", "7fefff", { reload: 1.80 }),
};

const requiredItemStatuses = [
    { item: Items.phaseFabric, amount: 1, status: StatusEffects.overdrive },
    { item: Items.silicon, amount: 1, status: StatusEffects.overclock },
];

const itemBoosterStatuses = [
    chronoStatuses.conductive,
    chronoStatuses.dense,
    chronoStatuses.focus,
    chronoStatuses.precision,
    chronoStatuses.slip,
    chronoStatuses.ignite,
    chronoStatuses.alloyed,
    StatusEffects.boss,
    chronoStatuses.jagged,
    chronoStatuses.elastic,
    StatusEffects.fast,
    chronoStatuses.surge,
    chronoStatuses.pyro,
    chronoStatuses.blast,
];

const liquidBoosterStatuses = [
    chronoStatuses.cooled,
    chronoStatuses.molten,
    chronoStatuses.lubed,
    chronoStatuses.cryo,
];

function maxEffectBoost() {
    return boostRules.maxBoost(BASE_EFFECT);
}

const blockType = extend(OverdriveProjectorClass, "chrono-buffer", {
    load() {
        this.super$load();
        if (Vars.headless) return;
        this.region = lib.loadRegion("chrono-buffer");
        this.topRegion = lib.loadRegion("chrono-buffer-top");
    },

    drawPlace(x, y, rotation, valid) {
        this.super$drawPlace(x, y, rotation, valid);
    },

    setStats() {
        this.super$setStats();
        try { this.stats.remove(Stat.booster); } catch (e) {}
        this.stats.add(Stat.abilities, "Each accepted item or liquid unlocks one allied unit status. Extra boosters increase radius and status duration.");
        boostRules.addBoosterStats(this.stats, "+{0}% duration", " duration");
    },

    setBars() {
        this.super$setBars();
        this.addBar("boost", lib.func(ent => new Bar(
            prov(() => Core.bundle.format("bar.boost", Mathf.round(Math.max(ent.realEffect() * 100 - 100, 0)))),
            prov(() => Pal.accent),
            floatp(() => ent.realEffect() / maxEffectBoost())
        )));
    }
});

blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked = true;
blockType.category = Category.units;
blockType.requirements = ItemStack.with(Items.lead, 200, Items.titanium, 130, Items.silicon, 130, Items.plastanium, 80, Items.surgeAlloy, 120);
blockType.size = 1;
blockType.health = 485;
blockType.range = BASE_RANGE;
blockType.effectBoost = BASE_EFFECT;
blockType.useTime = BASE_USE_TIME;
blockType.reload = APPLY_RELOAD;
blockType.ambientSoundVolume = 0.12;
blockType.hasBoost = false;
blockType.hasLiquids = true;
blockType.itemCapacity = boostRules.maxItemCapacity();
blockType.liquidCapacity = 120;
lib.enableAllEnvironments(blockType);
blockType.consumePower(10);
blockType.consumeItems(ItemStack.with(Items.phaseFabric, 1, Items.silicon, 1));

blockType.buildType = prov(() => {
    let boostTimer = APPLY_RELOAD;
    let activeItems = [];
    let activeLiquids = [];
    for (let i = 0; i < itemBoosters.length; i++) activeItems[i] = 0;
    for (let i = 0; i < liquidBoosters.length; i++) activeLiquids[i] = 0;

    return new JavaAdapter(OverdriveProjectorClass.OverdriveBuild, {
        version() { return 1; },

        realRange() {
            return boostRules.realRange(blockType.range, activeItems, activeLiquids);
        },

        boosterEffect() {
            return boostRules.activeBoost(activeItems, activeLiquids);
        },

        consumeBoosters() {
            boostRules.consumeBoosters(this, activeItems, activeLiquids);
        },

        range() {
            return this.realRange();
        },

        applyStatuses() {
            let realRange = this.realRange();
            let range2 = realRange * realRange;
            let duration = Math.max(APPLY_RELOAD + 1, APPLY_RELOAD * this.realEffect());
            Groups.unit.each(cons(u => {
                if (!u || u.team != this.team || !u.isValid() || this.dst2(u) > range2) return;
                for (let i = 0; i < requiredItemStatuses.length; i++) {
                    let b = requiredItemStatuses[i];
                    if (this.items != null && this.items.get(b.item) >= b.amount && b.status != null) {
                        u.apply(b.status, duration);
                    }
                }
                for (let i = 0; i < itemBoosters.length; i++) {
                    if (activeItems[i] > 0 && itemBoosterStatuses[i] != null) {
                        u.apply(itemBoosterStatuses[i], duration);
                    }
                }
                for (let i = 0; i < liquidBoosters.length; i++) {
                    if (activeLiquids[i] > 0 && liquidBoosterStatuses[i] != null) {
                        u.apply(liquidBoosterStatuses[i], duration);
                    }
                }
            }));
        },

        updateTile() {
            this.smoothEfficiency = Mathf.lerpDelta(this.smoothEfficiency, this.efficiency, 0.08);
            this.heat = Mathf.lerpDelta(this.heat, this.efficiency > 0 ? 1 : 0, 0.08);
            this.charge += this.heat * Time.delta;

            for (let i = 0; i < activeItems.length; i++) activeItems[i] = Math.max(0, activeItems[i] - Time.delta);
            for (let i = 0; i < activeLiquids.length; i++) activeLiquids[i] = Math.max(0, activeLiquids[i] - Time.delta);

            if (this.efficiency > 0) {
                boostTimer += Time.delta;
                if (boostTimer >= APPLY_RELOAD) {
                    this.consumeBoosters();
                    boostTimer %= APPLY_RELOAD;
                }
            }

            let boostEffect = this.boosterEffect();
            this.phaseHeat = Mathf.lerpDelta(this.phaseHeat, boostEffect / (maxEffectBoost() - BASE_EFFECT), 0.1);

            if (this.charge >= blockType.reload) {
                this.charge = 0;
                if (this.efficiency > 0) this.applyStatuses();
            }

            if (this.efficiency > 0) this.useProgress += this.delta();

            if (this.useProgress >= blockType.useTime) {
                this.consume();
                this.useProgress %= blockType.useTime;
            }
        },

        realEffect() {
            return (blockType.effectBoost + this.boosterEffect()) * this.efficiency;
        },

        drawSelect() {
            let realRange = this.realRange();
            let range2 = realRange * realRange;
            Tmp.c1.set(blockType.baseColor);
            Tmp.c1.a = Mathf.absin(4, 1);
            Lines.stroke(1, Tmp.c1);
            Groups.unit.each(cons(u => {
                if (!u || u.team != this.team || !u.isValid() || this.dst2(u) > range2) return;
                Lines.circle(u.x, u.y, Math.max(u.hitSize / 2 + 1.5, 3));
            }));
            Drawf.dashCircle(this.x, this.y, realRange, blockType.baseColor);
            Draw.reset();
        },

        draw() {
            if (Vars.headless) return;

            let f = 1 - (Time.time / 100) % 1;
            Draw.rect(blockType.region, this.x, this.y, TILE, TILE);
            Draw.color(blockType.baseColor, blockType.phaseColor, this.phaseHeat);
            Draw.alpha(this.heat * Mathf.absin(Time.time, 50 / Mathf.PI2, 1) * 0.5);
            Draw.rect(blockType.topRegion, this.x, this.y, TILE, TILE);
            Draw.alpha(1);
            Lines.stroke((2 * f + 0.1) * this.heat);
            Lines.square(this.x, this.y, Math.max(0, Mathf.clamp(2 - f * 2) * TILE / 2 - f - 0.2));
            Draw.reset();
        },

        acceptItem(source, item) {
            return boostRules.acceptsBoostItem(item) && this.items != null && this.items.get(item) < blockType.itemCapacity;
        },

        acceptStack(item, amount, source) {
            return boostRules.acceptsBoostItem(item) && this.items != null ? Math.min(amount, blockType.itemCapacity - this.items.get(item)) : 0;
        },

        acceptLiquid(source, liquid) {
            return boostRules.acceptsBoostLiquid(liquid) && this.liquids != null && this.liquids.get(liquid) < blockType.liquidCapacity;
        },

        write(write) {
            this.super$write(write);
            write.f(boostTimer);
            for (let i = 0; i < activeItems.length; i++) write.f(activeItems[i]);
            for (let i = 0; i < activeLiquids.length; i++) write.f(activeLiquids[i]);
        },

        read(read, revision) {
            this.super$read(read, revision);
            boostTimer = read.f();
            for (let i = 0; i < activeItems.length; i++) activeItems[i] = read.f();
            for (let i = 0; i < activeLiquids.length; i++) activeLiquids[i] = read.f();
        },
    }, blockType);
});

module.exports = blockType;
