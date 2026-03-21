require("lib");
const chronoUnloader       = require("chrono-unloader");
const chronoPusher         = require("chrono-pusher");
const chronoLiquidUnloader = require("chrono-liquid-unloader");
const chronoLiquidPusher   = require("chrono-liquid-pusher");

Events.on(ClientLoadEvent, cons(e => {
    const cost = ItemStack.with(Items.copper, 1, Items.lead, 1);
    const conveyorNode = TechTree.all.find(boolf(n => n.content === Blocks.conveyor));
    const conduitNode  = TechTree.all.find(boolf(n => n.content === Blocks.conduit));
    if (conveyorNode) {
        new TechTree.TechNode(conveyorNode, chronoUnloader, cost);
        new TechTree.TechNode(conveyorNode, chronoPusher,   cost);
    }
    if (conduitNode) {
        new TechTree.TechNode(conduitNode, chronoLiquidUnloader, cost);
        new TechTree.TechNode(conduitNode, chronoLiquidPusher,   cost);
    }
}));
