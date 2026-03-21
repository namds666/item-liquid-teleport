require("lib");
const chronoUnloader       = require("chrono-unloader");
const chronoPusher         = require("chrono-pusher");
const chronoLiquidUnloader = require("chrono-liquid-unloader");
const chronoLiquidPusher   = require("chrono-liquid-pusher");

const cost = ItemStack.with(Items.copper, 1, Items.lead, 1);

new TechTree.TechNode(TechTree.get(Blocks.conveyor), chronoUnloader,       cost);
new TechTree.TechNode(TechTree.get(Blocks.conveyor), chronoPusher,         cost);
new TechTree.TechNode(TechTree.get(Blocks.conduit),  chronoLiquidUnloader, cost);
new TechTree.TechNode(TechTree.get(Blocks.conduit),  chronoLiquidPusher,   cost);
