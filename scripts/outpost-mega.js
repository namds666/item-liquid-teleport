const outpost = require("outpost");

outpost.create({
    name: "outpost-mega",
    unitName: "outpost-mega-drone",
    size: 4,
    health: 880,
    mergeOnly: true,
    requirements: ItemStack.with(Items.copper, 120, Items.lead, 140, Items.graphite, 80),
    unitHealth: 400,
    hitSize: 20,
    engineOffset: 10.5,
    paths: [
        [8, 12, 16, 24, 32],
        [6, 7.5, 9, 12, 15],
        [2, 3, 4, 6, 8],
        [20, 30, 40, 60, 80],
        [3, 4],
        outpost.linear(11, 2, 41),
        outpost.linear(11, 2, 41),
        [3, 4, 5, 6, 7, 8, 9],
    ],
    statCosts: [
        ItemStack.with(Items.titanium, 240, Items.silicon, 120),
        ItemStack.with(Items.titanium, 480, Items.graphite, 320),
        ItemStack.with(Items.thorium, 320, Items.silicon, 240),
        ItemStack.with(Items.plastanium, 240, Items.thorium, 200),
    ],
    tierCosts: [
        ItemStack.with(Items.titanium, 1000, Items.silicon, 600),
    ],
    erekirStatCosts: [
        ItemStack.with(Items.beryllium, 240, Items.silicon, 120),
        ItemStack.with(Items.beryllium, 480, Items.graphite, 320),
        ItemStack.with(Items.tungsten, 320, Items.silicon, 240),
        ItemStack.with(Items.oxide, 240, Items.tungsten, 200),
    ],
    erekirTierCosts: [
        ItemStack.with(Items.beryllium, 600, Items.oxide, 240),
    ],
    beamCosts: [
        ItemStack.with(Items.graphite, 160, Items.silicon, 100),
        ItemStack.with(Items.titanium, 240, Items.silicon, 160),
        ItemStack.with(Items.thorium, 240, Items.silicon, 240),
        ItemStack.with(Items.plastanium, 190, Items.thorium, 190),
        ItemStack.with(Items.phaseFabric, 160, Items.surgeAlloy, 130),
        ItemStack.with(Items.phaseFabric, 320, Items.surgeAlloy, 260),
    ],
    erekirBeamCosts: [
        ItemStack.with(Items.beryllium, 160, Items.silicon, 100),
        ItemStack.with(Items.beryllium, 320, Items.silicon, 160),
        ItemStack.with(Items.tungsten, 240, Items.silicon, 240),
        ItemStack.with(Items.oxide, 190, Items.tungsten, 190),
        ItemStack.with(Items.phaseFabric, 160, Items.surgeAlloy, 130),
        ItemStack.with(Items.phaseFabric, 320, Items.surgeAlloy, 260),
    ],
});
