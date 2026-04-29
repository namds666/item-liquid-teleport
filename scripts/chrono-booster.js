const lib = require("lib");

const OverdriveProjectorClass = Packages.mindustry.world.blocks.defense.OverdriveProjector;

const TILE = Vars.tilesize;
const BASE_RANGE = 200;
const BASE_SPEED = 2.5;
const BASE_USE_TIME = 300;
const BOOST_DURATION = 65;

const itemBoosters = [
    { item: Items.copper, amount: 40, range: 3 * TILE, speed: 0.3 },
    { item: Items.lead, amount: 40, range: 3 * TILE, speed: 0.3 },
    { item: Items.metaglass, amount: 25, range: 6 * TILE, speed: 0.6 },
    { item: Items.graphite, amount: 20, range: 7 * TILE, speed: 0.7 },
    { item: Items.sand, amount: 50, range: 2.5 * TILE, speed: 0.2 },
    { item: Items.coal, amount: 35, range: 4 * TILE, speed: 0.4 },
    { item: Items.titanium, amount: 25, range: 6 * TILE, speed: 0.6 },
    { item: Items.thorium, amount: 12, range: 10 * TILE, speed: 1 },
    { item: Items.scrap, amount: 50, range: 2.5 * TILE, speed: 0.2 },
    { item: Items.plastanium, amount: 8, range: 12 * TILE, speed: 1.25 },
    { item: Items.sporePod, amount: 20, range: 7 * TILE, speed: 0.7 },
    { item: Items.surgeAlloy, amount: 4, range: 16 * TILE, speed: 1.75 },
    { item: Items.pyratite, amount: 3, range: 18 * TILE, speed: 2 },
    { item: Items.blastCompound, amount: 1, range: 25 * TILE, speed: 2.5 },
];
const oldItemBoostOrder = [
    Items.plastanium,
    Items.thorium,
    Items.copper,
    Items.lead,
    Items.pyratite,
    Items.blastCompound,
];

const liquidBoosters = [
    { liquid: Liquids.water, amount: 120, range: 2.5 * TILE, speed: 0.2 },
    { liquid: Liquids.slag, amount: 90, range: 5 * TILE, speed: 0.5 },
    { liquid: Liquids.oil, amount: 100, range: 4 * TILE, speed: 0.4 },
    { liquid: Liquids.cryofluid, amount: 60, range: 12 * TILE, speed: 1.25 },
];

function maxBoostSpeed() {
    let out = BASE_SPEED;
    for (let i = 0; i < itemBoosters.length; i++) out += itemBoosters[i].speed;
    for (let i = 0; i < liquidBoosters.length; i++) out += liquidBoosters[i].speed;
    return out;
}

function acceptsBoostItem(item) {
    if (item == Items.phaseFabric || item == Items.silicon) return true;
    for (let i = 0; i < itemBoosters.length; i++) {
        if (item == itemBoosters[i].item) return true;
    }
    return false;
}

function acceptsBoostLiquid(liquid) {
    for (let i = 0; i < liquidBoosters.length; i++) {
        if (liquid == liquidBoosters[i].liquid) return true;
    }
    return false;
}

function itemBoosterIndex(item) {
    for (let i = 0; i < itemBoosters.length; i++) {
        if (itemBoosters[i].item == item) return i;
    }
    return -1;
}

function addItemBoosterStat(stats, booster) {
    stats.add(Stat.booster, StatValues.itemBoosters(
        "+{0}%",
        60,
        booster.speed * 100,
        booster.range,
        ItemStack.with(booster.item, booster.amount)
    ));
}

function addLiquidBoosterStat(stats, booster) {
    stats.add(Stat.booster, new StatValue({ display: table => {
        table.row();
        table.table(cons(c => {
            c.table(Styles.grayPanel, cons(b => {
                b.add(StatValues.displayLiquid(booster.liquid, booster.amount, true)).pad(10).padLeft(15).left();
                b.table(cons(bt => {
                    bt.right().defaults().padRight(3).left();
                    bt.add("[lightgray]+[stat]" + Strings.autoFixed(booster.range / TILE, 2) + "[lightgray] " + StatUnit.blocks.localized()).row();
                    bt.add("[lightgray]+[stat]" + Strings.autoFixed(booster.speed * 100, 2) + "[lightgray]%");
                })).right().top().grow().pad(10).padRight(15);
            })).growX().pad(5).padBottom(-5).row();
        })).growX().colspan(table.getColumns());
        table.row();
    }}));
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
        for (let i = 0; i < itemBoosters.length; i++) addItemBoosterStat(this.stats, itemBoosters[i]);
        for (let i = 0; i < liquidBoosters.length; i++) addLiquidBoosterStat(this.stats, liquidBoosters[i]);
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
blockType.ambientSoundVolume = 0.12;
blockType.hasBoost = false;
blockType.hasLiquids = true;
blockType.itemCapacity = 10;
blockType.liquidCapacity = 120;
lib.enableAllEnvironments(blockType);
blockType.consumePower(10);
blockType.consumeItems(ItemStack.with(Items.phaseFabric, 1, Items.silicon, 1));

blockType.buildType = prov(() => {
    let boostTimer = 60;
    let activeItems = [];
    let activeLiquids = [];
    for (let i = 0; i < itemBoosters.length; i++) activeItems[i] = 0;
    for (let i = 0; i < liquidBoosters.length; i++) activeLiquids[i] = 0;

    return new JavaAdapter(OverdriveProjectorClass.OverdriveBuild, {
        version() { return 1; },

        realRange() {
            let out = blockType.range;
            for (let i = 0; i < itemBoosters.length; i++) {
                if (activeItems[i] > 0) out += itemBoosters[i].range;
            }
            for (let i = 0; i < liquidBoosters.length; i++) {
                if (activeLiquids[i] > 0) out += liquidBoosters[i].range;
            }
            return out;
        },

        boosterSpeed() {
            let out = 0;
            for (let i = 0; i < itemBoosters.length; i++) {
                if (activeItems[i] > 0) out += itemBoosters[i].speed;
            }
            for (let i = 0; i < liquidBoosters.length; i++) {
                if (activeLiquids[i] > 0) out += liquidBoosters[i].speed;
            }
            return out;
        },

        consumeBoosters() {
            for (let i = 0; i < itemBoosters.length; i++) {
                let b = itemBoosters[i];
                if (this.items != null && this.items.get(b.item) >= b.amount) {
                    this.items.remove(b.item, b.amount);
                    activeItems[i] = BOOST_DURATION;
                }
            }
            for (let i = 0; i < liquidBoosters.length; i++) {
                let b = liquidBoosters[i];
                if (this.liquids != null && this.liquids.get(b.liquid) >= b.amount) {
                    this.liquids.remove(b.liquid, b.amount);
                    activeLiquids[i] = BOOST_DURATION;
                }
            }
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
                if (boostTimer >= 60) {
                    this.consumeBoosters();
                    boostTimer %= 60;
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
            return acceptsBoostItem(item) && this.items != null && this.items.get(item) < blockType.itemCapacity;
        },

        acceptStack(item, amount, source) {
            return acceptsBoostItem(item) && this.items != null ? Math.min(amount, blockType.itemCapacity - this.items.get(item)) : 0;
        },

        acceptLiquid(source, liquid) {
            return acceptsBoostLiquid(liquid) && this.liquids != null && this.liquids.get(liquid) < blockType.liquidCapacity;
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
                for (let i = 0; i < oldItemBoostOrder.length; i++) {
                    let idx = itemBoosterIndex(oldItemBoostOrder[i]);
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
