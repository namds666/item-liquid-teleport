require("outpost").create({
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
        [6, 9, 12, 18, 24],
        [2, 3, 4, 6, 8],
        [80, 120, 160, 240, 320],
        [3, 4],
    ],
    statCosts: [
        ItemStack.with(Items.titanium, 240, Items.silicon, 120),
        ItemStack.with(Items.titanium, 480, Items.graphite, 320),
        ItemStack.with(Items.thorium, 320, Items.silicon, 240),
        ItemStack.with(Items.plastanium, 240, Items.thorium, 200),
    ],
    tierCosts: [
        ItemStack.with(Items.plastanium, 600, Items.surgeAlloy, 240),
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
});
