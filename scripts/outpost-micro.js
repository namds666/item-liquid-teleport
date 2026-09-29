const outpost = require("outpost");

outpost.create({
    name: "outpost-micro",
    unitName: "outpost-micro-drone",
    size: 1,
    health: 110,
    requirements: ItemStack.with(Items.copper, 8, Items.lead, 9, Items.graphite, 5),
    unitHealth: 50,
    hitSize: 6,
    engineOffset: 4.5,
    mergeInto: "outpost-small",
    paths: [
        [1, 2, 3],
        [1.4, 1.5, 1.6, 1.7, 1.8],
        [0.25, 0.4, 0.5, 0.75, 1.0],
        [3, 4, 5, 6, 7],
        [1, 2],
        outpost.linear(7, 2, 41),
        outpost.linear(7, 2, 41),
        [1, 2, 3, 4],
    ],
    statCosts: [
        ItemStack.with(Items.titanium, 30, Items.silicon, 15),
        ItemStack.with(Items.titanium, 60, Items.graphite, 40),
        ItemStack.with(Items.thorium, 40, Items.silicon, 30),
        ItemStack.with(Items.plastanium, 30, Items.thorium, 25),
    ],
    tierCosts: [
        ItemStack.with(Items.copper, 25, Items.lead, 25),
    ],
    erekirStatCosts: [
        ItemStack.with(Items.beryllium, 30, Items.silicon, 15),
        ItemStack.with(Items.beryllium, 60, Items.graphite, 40),
        ItemStack.with(Items.tungsten, 40, Items.silicon, 30),
        ItemStack.with(Items.oxide, 30, Items.tungsten, 25),
    ],
    erekirTierCosts: [
        ItemStack.with(Items.sand, 50),
    ],
    beamCosts: [
        ItemStack.with(Items.graphite, 20, Items.silicon, 10),
        ItemStack.with(Items.titanium, 30, Items.silicon, 20),
        ItemStack.with(Items.thorium, 30, Items.silicon, 30),
    ],
    erekirBeamCosts: [
        ItemStack.with(Items.beryllium, 20, Items.silicon, 10),
        ItemStack.with(Items.beryllium, 40, Items.silicon, 20),
        ItemStack.with(Items.tungsten, 30, Items.silicon, 30),
    ],
});
