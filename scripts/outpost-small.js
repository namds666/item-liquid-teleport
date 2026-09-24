require("outpost").create({
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
        [1.5, 1.7, 1.9, 2.1, 2.4],
        [0.5, 0.75, 1.0, 1.5, 2.0],
        [5, 6, 8, 10, 13],
        [1, 2],
        [9, 10, 11, 13, 15],
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
});
