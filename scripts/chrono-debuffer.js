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

const appliedStatuses = [
    { name: "Burning", effect: StatusEffects.burning },
    { name: "Electrified", effect: StatusEffects.electrified },
    { name: "Spore Slowed", effect: StatusEffects.sporeSlowed },
    { name: "Tarred", effect: StatusEffects.tarred },
    { name: "Shocked", effect: StatusEffects.shocked },
    { name: "Blasted", effect: StatusEffects.blasted },
    { name: "Corroded", effect: StatusEffects.corroded },
    { name: "Freezing", effect: StatusEffects.freezing },
    { name: "Wet", effect: StatusEffects.wet },
    { name: "Melting", effect: StatusEffects.melting },
    { name: "Sapped", effect: StatusEffects.sapped },
];

function maxEffectBoost() {
    return boostRules.maxBoost(BASE_EFFECT);
}

const blockType = extend(OverdriveProjectorClass, "chrono-debuffer", {
    load() {
        this.super$load();
        if (Vars.headless) return;
        this.region = lib.loadRegion("chrono-debuffer");
        this.topRegion = lib.loadRegion("chrono-debuffer-top");
    },

    drawPlace(x, y, rotation, valid) {
        this.super$drawPlace(x, y, rotation, valid);
    },

    setStats() {
        this.super$setStats();
        try { this.stats.remove(Stat.booster); } catch (e) {}
        this.stats.add(Stat.abilities, "Applies Burning, Electrified, Spore Slowed, Tarred, Shocked, Blasted, Corroded, Freezing, Wet, Melting, and Sapped to enemy units.");
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
                if (!u || u.team == this.team || !u.isValid() || this.dst2(u) > range2) return;
                for (let i = 0; i < appliedStatuses.length; i++) {
                    if (appliedStatuses[i].effect != null) u.apply(appliedStatuses[i].effect, duration);
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
                if (!u || u.team == this.team || !u.isValid() || this.dst2(u) > range2) return;
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

        chronoConsumesItem(item) {
            return boostRules.acceptsBoostItem(item);
        },

        chronoConsumesAnyItem() {
            return boostRules.itemBoosters.length > 0;
        },

        acceptStack(item, amount, source) {
            return boostRules.acceptsBoostItem(item) && this.items != null ? Math.min(amount, blockType.itemCapacity - this.items.get(item)) : 0;
        },

        acceptLiquid(source, liquid) {
            return boostRules.acceptsBoostLiquid(liquid) && this.liquids != null && this.liquids.get(liquid) < blockType.liquidCapacity;
        },

        chronoConsumesLiquid(liquid) {
            return boostRules.acceptsBoostLiquid(liquid);
        },

        chronoConsumesAnyLiquid() {
            return boostRules.liquidBoosters.length > 0;
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
