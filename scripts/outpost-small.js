const outpost = require("outpost");

outpost.create({
    name: "outpost-small",
    unitName: "outpost-small-drone",
    size: 2,
    health: 220,
    requirements: ItemStack.with(Items.copper, 30, Items.lead, 35, Items.graphite, 20),
    unitHealth: 100,
    hitSize: 8,
    engineOffset: 6,
    unitMineTier: 4,
    unitItemCapacity: 20,
    mergeInto: "outpost-mega",
    paths: [
        [2, 3, 4, 5, 6],
        [1.5, 1.6, 1.7, 1.8, 1.95],
        [0.5, 0.75, 1.0, 1.5, 2.0],
        [5, 6, 8, 10, 13],
        [1, 2],
        outpost.linear(9, 2, 41),
        outpost.linear(9, 2, 41),
        [1, 2, 3, 4, 5, 6, 7],
    ],
    statCosts: [
        ItemStack.with(Items.titanium, 60, Items.silicon, 30),
        ItemStack.with(Items.titanium, 120, Items.graphite, 80),
        ItemStack.with(Items.thorium, 80, Items.silicon, 60),
        ItemStack.with(Items.plastanium, 60, Items.thorium, 50),
    ],
    tierCosts: [
        ItemStack.with(Items.copper, 50, Items.lead, 50),
    ],
    erekirStatCosts: [
        ItemStack.with(Items.beryllium, 60, Items.silicon, 30),
        ItemStack.with(Items.beryllium, 120, Items.graphite, 80),
        ItemStack.with(Items.tungsten, 80, Items.silicon, 60),
        ItemStack.with(Items.oxide, 60, Items.tungsten, 50),
    ],
    erekirTierCosts: [
        ItemStack.with(Items.sand, 100),
    ],
    beamCosts: [
        ItemStack.with(Items.graphite, 40, Items.silicon, 20),
        ItemStack.with(Items.titanium, 60, Items.silicon, 40),
        ItemStack.with(Items.thorium, 60, Items.silicon, 60),
        ItemStack.with(Items.plastanium, 50, Items.thorium, 50),
        ItemStack.with(Items.phaseFabric, 40, Items.surgeAlloy, 30),
        ItemStack.with(Items.phaseFabric, 80, Items.surgeAlloy, 60),
    ],
    erekirBeamCosts: [
        ItemStack.with(Items.beryllium, 40, Items.silicon, 20),
        ItemStack.with(Items.beryllium, 80, Items.silicon, 40),
        ItemStack.with(Items.tungsten, 60, Items.silicon, 60),
        ItemStack.with(Items.oxide, 50, Items.tungsten, 50),
        ItemStack.with(Items.phaseFabric, 40, Items.surgeAlloy, 30),
        ItemStack.with(Items.phaseFabric, 80, Items.surgeAlloy, 60),
    ],
});
