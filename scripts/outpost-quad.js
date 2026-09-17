require("outpost").create({
    name: "outpost-quad",
    unitName: "outpost-quad-drone",
    size: 6,
    health: 1920,
    mergeOnly: true,
    requirements: ItemStack.with(Items.copper, 240, Items.lead, 280, Items.graphite, 160, Items.silicon, 80),
    unitHealth: 1600,
    hitSize: 36,
    engineOffset: 12,
    subDrone: { unitName: "outpost-small-drone", path: 0, max: 4, spawnTime: 120, stats: { speed: 1.5, mineSpeed: 0.5, capacity: 20 } },
    paths: [
        [20, 30, 40, 60, 80],
        [6, 9, 12, 18, 24],
        [2, 3, 4, 6, 8],
        [80, 120, 160, 240, 320],
        [3, 4],
    ],
    statCosts: [
        ItemStack.with(Items.titanium, 600, Items.silicon, 320),
        ItemStack.with(Items.thorium, 600, Items.silicon, 480),
        ItemStack.with(Items.plastanium, 480, Items.thorium, 400),
        ItemStack.with(Items.phaseFabric, 320, Items.surgeAlloy, 240),
    ],
    tierCosts: [
        ItemStack.with(Items.plastanium, 600, Items.phaseFabric, 240),
    ],
});
