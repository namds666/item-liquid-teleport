const lib = require("lib");

const OverdriveProjectorClass = Packages.mindustry.world.blocks.defense.OverdriveProjector;

const TILE = Vars.tilesize;
const BASE_RANGE = 200;
const BASE_EFFECT = 2.5;
const BASE_USE_TIME = 300;
const BOOST_DURATION = 65;
const APPLY_RELOAD = 60;

const itemBoosters = [
    { item: Items.copper, amount: 40, range: 3 * TILE, effect: 0.3 },
    { item: Items.lead, amount: 40, range: 3 * TILE, effect: 0.3 },
    { item: Items.metaglass, amount: 25, range: 6 * TILE, effect: 0.6 },
    { item: Items.graphite, amount: 20, range: 7 * TILE, effect: 0.7 },
    { item: Items.sand, amount: 50, range: 2.5 * TILE, effect: 0.2 },
    { item: Items.coal, amount: 35, range: 4 * TILE, effect: 0.4 },
    { item: Items.titanium, amount: 25, range: 6 * TILE, effect: 0.6 },
    { item: Items.thorium, amount: 12, range: 10 * TILE, effect: 1 },
    { item: Items.scrap, amount: 50, range: 2.5 * TILE, effect: 0.2 },
    { item: Items.plastanium, amount: 8, range: 12 * TILE, effect: 1.25 },
    { item: Items.sporePod, amount: 20, range: 7 * TILE, effect: 0.7 },
    { item: Items.surgeAlloy, amount: 4, range: 16 * TILE, effect: 1.75 },
    { item: Items.pyratite, amount: 3, range: 18 * TILE, effect: 2 },
    { item: Items.blastCompound, amount: 1, range: 25 * TILE, effect: 2.5 },
];

const liquidBoosters = [
    { liquid: Liquids.water, amount: 120, range: 2.5 * TILE, effect: 0.2 },
    { liquid: Liquids.slag, amount: 90, range: 5 * TILE, effect: 0.5 },
    { liquid: Liquids.oil, amount: 100, range: 4 * TILE, effect: 0.4 },
    { liquid: Liquids.cryofluid, amount: 60, range: 12 * TILE, effect: 1.25 },
];

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
    let out = BASE_EFFECT;
    for (let i = 0; i < itemBoosters.length; i++) out += itemBoosters[i].effect;
    for (let i = 0; i < liquidBoosters.length; i++) out += liquidBoosters[i].effect;
    return out;
}

function maxItemCapacity() {
    let out = 10;
    for (let i = 0; i < itemBoosters.length; i++) out = Math.max(out, itemBoosters[i].amount);
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

function addItemBoosterStat(stats, booster) {
    stats.add(Stat.booster, StatValues.itemBoosters(
        "+{0}%",
        APPLY_RELOAD,
        booster.effect * 100,
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
                    bt.add("[lightgray]+[stat]" + Strings.autoFixed(booster.effect * 100, 2) + "[lightgray]% duration");
                })).right().top().grow().pad(10).padRight(15);
            })).growX().pad(5).padBottom(-5).row();
        })).growX().colspan(table.getColumns());
        table.row();
    }}));
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
        for (let i = 0; i < itemBoosters.length; i++) addItemBoosterStat(this.stats, itemBoosters[i]);
        for (let i = 0; i < liquidBoosters.length; i++) addLiquidBoosterStat(this.stats, liquidBoosters[i]);
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
blockType.itemCapacity = maxItemCapacity();
blockType.liquidCapacity = 120;
lib.enableAllEnvironments(blockType);
blockType.consumePower(10);
blockType.consumeItems(ItemStack.with(Items.phaseFabric, 1, Items.silicon, 1));

function createBoostState() {
    let state = { boostTimer: APPLY_RELOAD, activeItems: [], activeLiquids: [] };
    for (let i = 0; i < itemBoosters.length; i++) state.activeItems[i] = 0;
    for (let i = 0; i < liquidBoosters.length; i++) state.activeLiquids[i] = 0;
    return state;
}

function activeRange(state, baseRange) {
    let out = baseRange;
    for (let i = 0; i < itemBoosters.length; i++) if (state.activeItems[i] > 0) out += itemBoosters[i].range;
    for (let i = 0; i < liquidBoosters.length; i++) if (state.activeLiquids[i] > 0) out += liquidBoosters[i].range;
    return out;
}

function activeBoosterEffect(state) {
    let out = 0;
    for (let i = 0; i < itemBoosters.length; i++) if (state.activeItems[i] > 0) out += itemBoosters[i].effect;
    for (let i = 0; i < liquidBoosters.length; i++) if (state.activeLiquids[i] > 0) out += liquidBoosters[i].effect;
    return out;
}

function consumeActiveBoosters(build, state) {
    for (let i = 0; i < itemBoosters.length; i++) {
        let b = itemBoosters[i];
        if (build.items != null && build.items.get(b.item) >= b.amount) {
            build.items.remove(b.item, b.amount);
            state.activeItems[i] = BOOST_DURATION;
        }
    }
    for (let i = 0; i < liquidBoosters.length; i++) {
        let b = liquidBoosters[i];
        if (build.liquids != null && build.liquids.get(b.liquid) >= b.amount) {
            build.liquids.remove(b.liquid, b.amount);
            state.activeLiquids[i] = BOOST_DURATION;
        }
    }
}

function tickBoostDurations(state) {
    for (let i = 0; i < state.activeItems.length; i++) state.activeItems[i] = Math.max(0, state.activeItems[i] - Time.delta);
    for (let i = 0; i < state.activeLiquids.length; i++) state.activeLiquids[i] = Math.max(0, state.activeLiquids[i] - Time.delta);
}

function updateBoostState(build, state) {
    tickBoostDurations(state);
    if (build.efficiency <= 0) return;

    state.boostTimer += Time.delta;
    if (state.boostTimer >= APPLY_RELOAD) {
        consumeActiveBoosters(build, state);
        state.boostTimer %= APPLY_RELOAD;
    }
}

function updateProjectorBase(build) {
    build.smoothEfficiency = Mathf.lerpDelta(build.smoothEfficiency, build.efficiency, 0.08);
    build.heat = Mathf.lerpDelta(build.heat, build.efficiency > 0 ? 1 : 0, 0.08);
    build.charge += build.heat * Time.delta;
}

function updateUseProgress(build) {
    if (build.efficiency > 0) build.useProgress += build.delta();
    if (build.useProgress >= blockType.useTime) {
        build.consume();
        build.useProgress %= blockType.useTime;
    }
}

function writeBoostState(state, write) {
    write.f(state.boostTimer);
    for (let i = 0; i < state.activeItems.length; i++) write.f(state.activeItems[i]);
    for (let i = 0; i < state.activeLiquids.length; i++) write.f(state.activeLiquids[i]);
}

function readBoostState(state, read) {
    state.boostTimer = read.f();
    for (let i = 0; i < state.activeItems.length; i++) state.activeItems[i] = read.f();
    for (let i = 0; i < state.activeLiquids.length; i++) state.activeLiquids[i] = read.f();
}

blockType.buildType = prov(() => {
    let boostState = createBoostState();

    return new JavaAdapter(OverdriveProjectorClass.OverdriveBuild, {
        version() { return 1; },

        realRange() {
            return activeRange(boostState, blockType.range);
        },

        boosterEffect() {
            return activeBoosterEffect(boostState);
        },

        consumeBoosters() {
            consumeActiveBoosters(this, boostState);
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
            updateProjectorBase(this);
            updateBoostState(this, boostState);
            let boostEffect = this.boosterEffect();
            this.phaseHeat = Mathf.lerpDelta(this.phaseHeat, boostEffect / (maxEffectBoost() - BASE_EFFECT), 0.1);

            if (this.charge >= blockType.reload) {
                this.charge = 0;
                if (this.efficiency > 0) this.applyStatuses();
            }

            updateUseProgress(this);
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

        acceptItem(_source, item) {
            return acceptsBoostItem(item) && this.items != null && this.items.get(item) < blockType.itemCapacity;
        },

        acceptStack(item, amount, _source) {
            return acceptsBoostItem(item) && this.items != null ? Math.min(amount, blockType.itemCapacity - this.items.get(item)) : 0;
        },

        acceptLiquid(_source, liquid) {
            return acceptsBoostLiquid(liquid) && this.liquids != null && this.liquids.get(liquid) < blockType.liquidCapacity;
        },

        write(write) {
            this.super$write(write);
            writeBoostState(boostState, write);
        },

        read(read, revision) {
            this.super$read(read, revision);
            readBoostState(boostState, read);
        },
    }, blockType);
});

module.exports = blockType;
