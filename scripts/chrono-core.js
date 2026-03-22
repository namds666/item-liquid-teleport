
const lib = require("lib");

const blockType = extend(CoreBlock, "chrono-core", {
    load() {
        this.super$load();
        this.region = lib.loadRegion("chrono-core");
    },
    canPlaceOn(tile, team) { return true; },
    placeBegan(tile, previous) {},
    beforePlaceBegan(tile, previous) {},
});

blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked  = true;
blockType.category        = Category.effect;
blockType.size            = 1;
blockType.health          = 500;
blockType.unitType        = UnitTypes.gamma;
blockType.requirements    = ItemStack.with(Items.copper, 1000, Items.lead, 1000);

blockType.buildType = prov(() => new JavaAdapter(CoreBlock.CoreBuild, {}, blockType));

module.exports = blockType;
