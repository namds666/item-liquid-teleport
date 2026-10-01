const TILE = Vars.tilesize;
const MAX_LEVEL = 10;

function levels(base, step) {
    let out = [];
    for (let i = 0; i <= MAX_LEVEL; i++) out.push(base + step * i);
    return out;
}

const RANGE_LEVELS = levels(20, 1);
const CHANNEL_LEVELS = levels(120, -6);

function pairCosts(rows) {
    let out = [];
    for (let i = 0; i < MAX_LEVEL; i++) {
        let r = rows[Math.floor(i / 2)];
        out.push(ItemStack.with(r[0], r[1], r[2], r[3]));
    }
    return out;
}

const COSTS = pairCosts([
    [Items.titanium, 150, Items.silicon, 80],
    [Items.thorium, 150, Items.silicon, 120],
    [Items.plastanium, 120, Items.thorium, 100],
    [Items.phaseFabric, 80, Items.surgeAlloy, 60],
    [Items.phaseFabric, 160, Items.surgeAlloy, 120]
]);

const EREKIR_COSTS = pairCosts([
    [Items.beryllium, 150, Items.silicon, 80],
    [Items.tungsten, 150, Items.silicon, 120],
    [Items.oxide, 120, Items.tungsten, 100],
    [Items.phaseFabric, 80, Items.surgeAlloy, 60],
    [Items.phaseFabric, 160, Items.surgeAlloy, 120]
]);

function clampLevel(level) {
    return Math.max(0, Math.min(MAX_LEVEL, Math.floor(level) || 0));
}

exports.TILE = TILE;
exports.BLOCK_SIZE = 3;
exports.BLOCK_HEALTH = 600;
exports.ITEM_CAPACITY = 100;
exports.REQUIREMENTS = ItemStack.with(Items.copper, 60, Items.lead, 70, Items.graphite, 40, Items.silicon, 40);
exports.RESPAWN_TIME = 600;
exports.RESPAWN_ITEM = Items.silicon;
exports.RESPAWN_COST = 25;
exports.YURI_HEALTH = 300;
exports.YURI_SPEED = 0.55;
exports.YURI_HIT_SIZE = 8;
exports.RANGE_LEVELS = RANGE_LEVELS;
exports.CHANNEL_LEVELS = CHANNEL_LEVELS;
exports.MAX_LEVEL = MAX_LEVEL;
exports.COSTS = COSTS;
exports.EREKIR_COSTS = EREKIR_COSTS;
exports.upgradeCost = function(level) {
    if (level >= MAX_LEVEL) return null;
    let table = Vars.state.rules.planet == Planets.erekir ? EREKIR_COSTS : COSTS;
    return table[Math.max(0, Math.floor(level) || 0)];
};
exports.rangeTiles = function(level) {
    return RANGE_LEVELS[clampLevel(level)];
};
exports.channelTicks = function(level) {
    return CHANNEL_LEVELS[clampLevel(level)];
};
