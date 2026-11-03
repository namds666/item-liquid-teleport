const lib = require("lib");

const POWER_PER_SECOND = 15;

const chronoGenerator = extend(PowerGenerator, "chrono-generator", {
    load() {
        this.super$load();
        if (Vars.headless) return;
        this.topRegion = lib.loadRegion("chrono-generator-top");
    }
});

chronoGenerator.size            = 1;
chronoGenerator.health          = 400;
chronoGenerator.powerProduction = POWER_PER_SECOND / 60;
chronoGenerator.buildVisibility = BuildVisibility.shown;
chronoGenerator.alwaysUnlocked  = true;
chronoGenerator.category        = Category.power;
chronoGenerator.requirements    = ItemStack.with(Items.copper, 30, Items.lead, 15);
lib.enableAllEnvironments(chronoGenerator);

chronoGenerator.buildType = prov(() => new JavaAdapter(PowerGenerator.GeneratorBuild, {
    updateTile() {
        this.productionEfficiency = 1;
        this.super$updateTile();
    },

    draw() {
        this.super$draw();
        if (Vars.headless) return;
        let region = chronoGenerator.topRegion;
        if (region == null || !region.found()) return;
        Draw.color(Pal.accent);
        Draw.alpha(0.45 + Mathf.absin(Time.time, 12, 0.45));
        Draw.rect(region, this.x, this.y);
        Draw.reset();
    }
}, chronoGenerator));

module.exports = chronoGenerator;
