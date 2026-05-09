const lib = require("lib");
const boostRules = require("chrono-boost-rules");

const OverdriveProjectorClass = Packages.mindustry.world.blocks.defense.OverdriveProjector;

const TILE = boostRules.TILE;
const BASE_RANGE = boostRules.BASE_RANGE;
const BASE_SPEED = 2.5;
const BASE_USE_TIME = 300;
const APPLY_RELOAD = boostRules.APPLY_RELOAD;
const itemBoosters = boostRules.itemBoosters;
const liquidBoosters = boostRules.liquidBoosters;

function maxBoostSpeed() {
    return boostRules.maxBoost(BASE_SPEED);
}

const blockType = extend(OverdriveProjectorClass, "chrono-booster", {
    load() {
        this.super$load();
        if (Vars.headless) return;
        this.region = lib.loadRegion("chrono-booster");
        this.topRegion = lib.loadRegion("chrono-booster-top");
    },

    drawPlace(x, y, rotation, valid) {
        this.super$drawPlace(x, y, rotation, valid);
    },

    setStats() {
        this.super$setStats();
        try { this.stats.remove(Stat.booster); } catch (e) {}
        boostRules.addBoosterStats(this.stats, "+{0}%", "");
    },

    setBars() {
        this.super$setBars();
        this.addBar("boost", lib.func(ent => new Bar(
            prov(() => Core.bundle.format("bar.boost", Mathf.round(Math.max(ent.realBoost() * 100 - 100, 0)))),
            prov(() => Pal.accent),
            floatp(() => ent.realBoost() / maxBoostSpeed())
        )));
    }
});

blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked = true;
blockType.category = Category.effect;
blockType.requirements = ItemStack.with(Items.lead, 200, Items.titanium, 130, Items.silicon, 130, Items.plastanium, 80, Items.surgeAlloy, 120);
blockType.size = 1;
blockType.health = 485;
blockType.range = BASE_RANGE;
blockType.speedBoost = BASE_SPEED;
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

        boosterSpeed() {
            return boostRules.activeBoost(activeItems, activeLiquids);
        },

        consumeBoosters() {
            boostRules.consumeBoosters(this, activeItems, activeLiquids);
        },

        range() {
            return this.realRange();
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

            let boostSpeed = this.boosterSpeed();
            this.phaseHeat = Mathf.lerpDelta(this.phaseHeat, boostSpeed / (maxBoostSpeed() - BASE_SPEED), 0.1);

            if (this.charge >= blockType.reload) {
                this.charge = 0;
                Vars.indexer.eachBlock(this, this.realRange(), boolf(other => other.block.canOverdrive), cons(other => {
                    other.applyBoost(this.realBoost(), blockType.reload + 1);
                }));
            }

            if (this.efficiency > 0) this.useProgress += this.delta();

            if (this.useProgress >= blockType.useTime) {
                this.consume();
                this.useProgress %= blockType.useTime;
            }
        },

        realBoost() {
            return (blockType.speedBoost + this.boosterSpeed()) * this.efficiency;
        },

        drawSelect() {
            let realRange = this.realRange();
            Vars.indexer.eachBlock(this, realRange, boolf(other => other.block.canOverdrive), cons(other => {
                Tmp.c1.set(blockType.baseColor);
                Tmp.c1.a = Mathf.absin(4, 1);
                Drawf.selected(other, Tmp.c1);
            }));
            Drawf.dashCircle(this.x, this.y, realRange, blockType.baseColor);
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
            if (revision < 1) {
                for (let i = 0; i < boostRules.oldItemBoostOrder.length; i++) {
                    let idx = boostRules.itemBoosterIndex(boostRules.oldItemBoostOrder[i]);
                    let value = read.f();
                    if (idx >= 0) activeItems[idx] = value;
                }
            } else {
                for (let i = 0; i < activeItems.length; i++) activeItems[i] = read.f();
                for (let i = 0; i < activeLiquids.length; i++) activeLiquids[i] = read.f();
            }
        },
    }, blockType);
});

module.exports = blockType;
