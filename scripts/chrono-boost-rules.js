const TILE = Vars.tilesize;
const BASE_RANGE = 200;
const BOOST_DURATION = 125;
const APPLY_RELOAD = 120;

const itemBoosters = [
    { item: Items.copper, amount: 40, rangeFlat: 6 * TILE, rangeMul: 1, boost: 0.3 },
    { item: Items.lead, amount: 40, rangeFlat: 6 * TILE, rangeMul: 1, boost: 0.3 },
    { item: Items.metaglass, amount: 25, rangeFlat: 9 * TILE, rangeMul: 1, boost: 0.6 },
    { item: Items.graphite, amount: 20, rangeFlat: 10 * TILE, rangeMul: 1, boost: 0.7 },
    { item: Items.sand, amount: 50, rangeFlat: 6 * TILE, rangeMul: 1, boost: 0.2 },
    { item: Items.coal, amount: 35, rangeFlat: 8 * TILE, rangeMul: 1, boost: 0.4 },
    { item: Items.titanium, amount: 25, rangeFlat: 10 * TILE, rangeMul: 1, boost: 0.6 },
    { item: Items.thorium, amount: 12, rangeFlat: 12 * TILE, rangeMul: 1, boost: 1 },
    { item: Items.scrap, amount: 50, rangeFlat: 6 * TILE, rangeMul: 1, boost: 0.2 },
    { item: Items.plastanium, amount: 8, rangeFlat: 12 * TILE, rangeMul: 1, boost: 1.25 },
    { item: Items.sporePod, amount: 20, rangeFlat: 10 * TILE, rangeMul: 1, boost: 0.7 },
    { item: Items.surgeAlloy, amount: 4, rangeFlat: 16 * TILE, rangeMul: 1, boost: 1.75 },
    { item: Items.pyratite, amount: 3, rangeFlat: 18 * TILE, rangeMul: 1, boost: 2 },
    { item: Items.blastCompound, amount: 1, rangeFlat: 25 * TILE, rangeMul: 1, boost: 2.5 },
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
    { liquid: Liquids.water, amount: 120, rangeFlat: 2.5 * TILE, rangeMul: 1, boost: 0.2 },
    { liquid: Liquids.slag, amount: 90, rangeFlat: 5 * TILE, rangeMul: 1, boost: 0.5 },
    { liquid: Liquids.oil, amount: 100, rangeFlat: 4 * TILE, rangeMul: 1, boost: 0.4 },
    { liquid: Liquids.cryofluid, amount: 60, rangeFlat: 12 * TILE, rangeMul: 1, boost: 1.25 },
];

function boosterRangeFlat(booster) {
    return booster.rangeFlat == null ? 0 : booster.rangeFlat;
}

function boosterRangeMul(booster) {
    return booster.rangeMul == null ? 1 : booster.rangeMul;
}

function maxBoost(baseBoost) {
    let out = baseBoost;
    for (let i = 0; i < itemBoosters.length; i++) out += itemBoosters[i].boost;
    for (let i = 0; i < liquidBoosters.length; i++) out += liquidBoosters[i].boost;
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

function itemBoosterIndex(item) {
    for (let i = 0; i < itemBoosters.length; i++) {
        if (itemBoosters[i].item == item) return i;
    }
    return -1;
}

function realRange(baseRange, activeItems, activeLiquids) {
    let flat = baseRange;
    let mul = 1;

    for (let i = 0; i < itemBoosters.length; i++) {
        if (activeItems[i] > 0) {
            flat += boosterRangeFlat(itemBoosters[i]);
            mul *= boosterRangeMul(itemBoosters[i]);
        }
    }

    for (let i = 0; i < liquidBoosters.length; i++) {
        if (activeLiquids[i] > 0) {
            flat += boosterRangeFlat(liquidBoosters[i]);
            mul *= boosterRangeMul(liquidBoosters[i]);
        }
    }

    return flat * mul;
}

function activeBoost(activeItems, activeLiquids) {
    let out = 0;
    for (let i = 0; i < itemBoosters.length; i++) {
        if (activeItems[i] > 0) out += itemBoosters[i].boost;
    }
    for (let i = 0; i < liquidBoosters.length; i++) {
        if (activeLiquids[i] > 0) out += liquidBoosters[i].boost;
    }
    return out;
}

function consumeBoosters(build, activeItems, activeLiquids) {
    for (let i = 0; i < itemBoosters.length; i++) {
        let b = itemBoosters[i];
        if (build.items != null && build.items.get(b.item) >= b.amount) {
            build.items.remove(b.item, b.amount);
            activeItems[i] = BOOST_DURATION;
        }
    }
    for (let i = 0; i < liquidBoosters.length; i++) {
        let b = liquidBoosters[i];
        if (build.liquids != null && build.liquids.get(b.liquid) >= b.amount) {
            build.liquids.remove(b.liquid, b.amount);
            activeLiquids[i] = BOOST_DURATION;
        }
    }
}

function rangeStatText(booster) {
    let out = "[lightgray]+[stat]" + Strings.autoFixed(boosterRangeFlat(booster) / TILE, 2) + "[lightgray] " + StatUnit.blocks.localized();
    let mul = boosterRangeMul(booster);
    if (mul != 1) out += " [lightgray]x[stat]" + Strings.autoFixed(mul, 2) + "[lightgray] radius";
    return out;
}

function addItemBoosterStat(stats, booster, boostFormat) {
    stats.add(Stat.booster, StatValues.itemBoosters(
        boostFormat,
        APPLY_RELOAD,
        booster.boost * 100,
        boosterRangeFlat(booster),
        ItemStack.with(booster.item, booster.amount)
    ));
}

function addLiquidBoosterStat(stats, booster, boostText) {
    stats.add(Stat.booster, new StatValue({ display: table => {
        table.row();
        table.table(cons(c => {
            c.table(Styles.grayPanel, cons(b => {
                b.add(StatValues.displayLiquid(booster.liquid, booster.amount, true)).pad(10).padLeft(15).left();
                b.table(cons(bt => {
                    bt.right().defaults().padRight(3).left();
                    bt.add(rangeStatText(booster)).row();
                    bt.add("[lightgray]+[stat]" + Strings.autoFixed(booster.boost * 100, 2) + "[lightgray]%" + boostText);
                })).right().top().grow().pad(10).padRight(15);
            })).growX().pad(5).padBottom(-5).row();
        })).growX().colspan(table.getColumns());
        table.row();
    }}));
}

function addBoosterStats(stats, boostFormat, liquidBoostText) {
    for (let i = 0; i < itemBoosters.length; i++) addItemBoosterStat(stats, itemBoosters[i], boostFormat);
    for (let i = 0; i < liquidBoosters.length; i++) addLiquidBoosterStat(stats, liquidBoosters[i], liquidBoostText);
}

module.exports = {
    TILE: TILE,
    BASE_RANGE: BASE_RANGE,
    BOOST_DURATION: BOOST_DURATION,
    APPLY_RELOAD: APPLY_RELOAD,
    itemBoosters: itemBoosters,
    liquidBoosters: liquidBoosters,
    oldItemBoostOrder: oldItemBoostOrder,
    maxBoost: maxBoost,
    maxItemCapacity: maxItemCapacity,
    acceptsBoostItem: acceptsBoostItem,
    acceptsBoostLiquid: acceptsBoostLiquid,
    itemBoosterIndex: itemBoosterIndex,
    realRange: realRange,
    activeBoost: activeBoost,
    consumeBoosters: consumeBoosters,
    addBoosterStats: addBoosterStats,
};
