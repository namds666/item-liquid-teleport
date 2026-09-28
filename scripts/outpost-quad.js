const outpost = require("outpost");

outpost.create({
    name: "outpost-quad",
    unitName: "outpost-quad-drone",
    size: 6,
    health: 1920,
    mergeOnly: true,
    requirements: ItemStack.with(Items.copper, 240, Items.lead, 280, Items.graphite, 160, Items.silicon, 80),
    unitHealth: 1600,
    hitSize: 36,
    engineOffset: 12,
    subDrone: { unitName: "outpost-small-drone", path: 0, max: 4, spawnTime: 120, stats: { mineSpeed: 0.5, capacity: 5, range: 9 } },
    paths: [
        [20, 30, 40, 60, 80],
        [6, 7.5, 9, 12, 15],
        [2, 3, 4, 6, 8],
        [20, 30, 40, 60, 80],
        [3, 4],
        outpost.linear(11, 2, 41),
        outpost.linear(11, 2, 41),
        [4, 5, 6, 7, 8, 9, 10],
    ],
    statCosts: [
        ItemStack.with(Items.titanium, 600, Items.silicon, 320),
        ItemStack.with(Items.thorium, 600, Items.silicon, 480),
        ItemStack.with(Items.plastanium, 480, Items.thorium, 400),
        ItemStack.with(Items.phaseFabric, 320, Items.surgeAlloy, 240),
    ],
    tierCosts: [
        ItemStack.with(Items.plastanium, 600, Items.surgeAlloy, 240),
    ],
    erekirStatCosts: [
        ItemStack.with(Items.beryllium, 600, Items.silicon, 320),
        ItemStack.with(Items.tungsten, 600, Items.silicon, 480),
        ItemStack.with(Items.oxide, 480, Items.tungsten, 400),
        ItemStack.with(Items.phaseFabric, 320, Items.surgeAlloy, 240),
    ],
    erekirTierCosts: [
        ItemStack.with(Items.beryllium, 600, Items.oxide, 240),
    ],
    beamCosts: [
        ItemStack.with(Items.graphite, 400, Items.silicon, 240),
        ItemStack.with(Items.titanium, 600, Items.silicon, 400),
        ItemStack.with(Items.thorium, 600, Items.silicon, 600),
        ItemStack.with(Items.plastanium, 480, Items.thorium, 480),
        ItemStack.with(Items.phaseFabric, 400, Items.surgeAlloy, 320),
        ItemStack.with(Items.phaseFabric, 800, Items.surgeAlloy, 640),
    ],
    erekirBeamCosts: [
        ItemStack.with(Items.beryllium, 400, Items.silicon, 240),
        ItemStack.with(Items.beryllium, 800, Items.silicon, 400),
        ItemStack.with(Items.tungsten, 600, Items.silicon, 600),
        ItemStack.with(Items.oxide, 480, Items.tungsten, 480),
        ItemStack.with(Items.phaseFabric, 400, Items.surgeAlloy, 320),
        ItemStack.with(Items.phaseFabric, 800, Items.surgeAlloy, 640),
    ],
});
