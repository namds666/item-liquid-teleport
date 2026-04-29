const lib = require("lib");

const OverdriveProjectorClass = Packages.mindustry.world.blocks.defense.OverdriveProjector;

const TILE = Vars.tilesize;
const BASE_RANGE = 200;
const BASE_SPEED = 2.5;
const BASE_USE_TIME = 300;
const MAX_BOOST_SPEED = BASE_SPEED + 0.5 * 4 + 2.5 * 2;
const BOOST_DURATION = 65;

const boosters = [
    { item: Items.plastanium, amount: 1, range: 10 * TILE, speed: 0.5 },
    { item: Items.thorium, amount: 10, range: 10 * TILE, speed: 0.5 },
    { item: Items.copper, amount: 10, range: 10 * TILE, speed: 0.5 },
    { item: Items.lead, amount: 10, range: 10 * TILE, speed: 0.5 },
    { item: Items.pyratite, amount: 1, range: 50 * TILE, speed: 2.5 },
    { item: Items.blastCompound, amount: 1, range: 50 * TILE, speed: 2.5 },
];

function acceptsBoostItem(item) {
    if (item == Items.phaseFabric || item == Items.silicon) return true;
    for (let i = 0; i < boosters.length; i++) {
        if (item == boosters[i].item) return true;
    }
    return false;
}

const blockType = extend(OverdriveProjectorClass, "chrono-booster", {
    load() {
        this.super$load();
        if (Vars.headless) return;
        this.region = Core.atlas.find("overdrive-dome");
        this.topRegion = Core.atlas.find("overdrive-dome-top");
    },

    drawPlace(x, y, rotation, valid) {
        this.super$drawPlace(x, y, rotation, valid);
    },

    setStats() {
        this.super$setStats();
        this.stats.add(Stat.booster, "Plastanium: 1/sec, +50% speed, +10 range");
        this.stats.add(Stat.booster, "Thorium: 10/sec, +50% speed, +10 range");
        this.stats.add(Stat.booster, "Copper: 10/sec, +50% speed, +10 range");
        this.stats.add(Stat.booster, "Lead: 10/sec, +50% speed, +10 range");
        this.stats.add(Stat.booster, "Pyratite: 1/sec, +250% speed, +50 range");
        this.stats.add(Stat.booster, "Blast Compound: 1/sec, +250% speed, +50 range");
    },

    setBars() {
        this.super$setBars();
        this.addBar("boost", lib.func(ent => new Bar(
            prov(() => Core.bundle.format("bar.boost", Mathf.round(Math.max(ent.realBoost() * 100 - 100, 0)))),
            prov(() => Pal.accent),
            floatp(() => ent.realBoost() / MAX_BOOST_SPEED)
        )));
    }
});

blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked = true;
blockType.category = Category.effect;
blockType.requirements = ItemStack.with(Items.lead, 200, Items.titanium, 130, Items.silicon, 130, Items.plastanium, 80, Items.surgeAlloy, 120);
blockType.size = 1;
blockType.health = 485;
blockType.range = BASE_RANGE;
blockType.speedBoost = BASE_SPEED;
blockType.useTime = BASE_USE_TIME;
blockType.ambientSoundVolume = 0.12;
blockType.hasBoost = false;
blockType.itemCapacity = 10;
lib.enableAllEnvironments(blockType);
blockType.consumePower(10);
blockType.consumeItems(ItemStack.with(Items.phaseFabric, 1, Items.silicon, 1));

blockType.buildType = prov(() => {
    let boostTimer = 60;
    let active = [0, 0, 0, 0, 0, 0];

    return new JavaAdapter(OverdriveProjectorClass.OverdriveBuild, {
        realRange() {
            let out = blockType.range;
            for (let i = 0; i < boosters.length; i++) {
                if (active[i] > 0) out += boosters[i].range;
            }
            return out;
        },

        boosterSpeed() {
            let out = 0;
            for (let i = 0; i < boosters.length; i++) {
                if (active[i] > 0) out += boosters[i].speed;
            }
            return out;
        },

        consumeBoosters() {
            for (let i = 0; i < boosters.length; i++) {
                let b = boosters[i];
                if (this.items != null && this.items.get(b.item) >= b.amount) {
                    this.items.remove(b.item, b.amount);
                    active[i] = BOOST_DURATION;
                }
            }
        },

        range() {
            return this.realRange();
        },

        updateTile() {
            this.smoothEfficiency = Mathf.lerpDelta(this.smoothEfficiency, this.efficiency, 0.08);
            this.heat = Mathf.lerpDelta(this.heat, this.efficiency > 0 ? 1 : 0, 0.08);
            this.charge += this.heat * Time.delta;

            for (let i = 0; i < active.length; i++) active[i] = Math.max(0, active[i] - Time.delta);

            if (this.efficiency > 0) {
                boostTimer += Time.delta;
                if (boostTimer >= 60) {
                    this.consumeBoosters();
                    boostTimer %= 60;
                }
            }

            let boostSpeed = this.boosterSpeed();
            this.phaseHeat = Mathf.lerpDelta(this.phaseHeat, boostSpeed / (MAX_BOOST_SPEED - BASE_SPEED), 0.1);

            if (this.charge >= blockType.reload) {
                this.charge = 0;
                Vars.indexer.eachBlock(this, this.realRange(), boolf(other => other.block.canOverdrive), cons(other => {
                    other.applyBoost(this.realBoost(), blockType.reload + 1);
                }));
            }

            if (this.efficiency > 0) this.useProgress += this.delta();

            if (this.useProgress >= blockType.useTime) {
                this.consume();
                this.useProgress %= blockType.useTime;
            }
        },

        realBoost() {
            return (blockType.speedBoost + this.boosterSpeed()) * this.efficiency;
        },

        drawSelect() {
            let realRange = this.realRange();
            Vars.indexer.eachBlock(this, realRange, boolf(other => other.block.canOverdrive), cons(other => {
                Drawf.selected(other, Tmp.c1.set(blockType.baseColor).a(Mathf.absin(4, 1)));
            }));
            Drawf.dashCircle(this.x, this.y, realRange, blockType.baseColor);
        },

        draw() {
            if (Vars.headless) return;

            let f = 1 - (Time.time / 100) % 1;
            Draw.rect(blockType.region, this.x, this.y, TILE, TILE);
            Draw.color(blockType.baseColor, blockType.phaseColor, this.phaseHeat);
            Draw.alpha(this.heat * Mathf.absin(Time.time, 50 / Mathf.PI2, 1) * 0.5);
            Draw.rect(blockType.topRegion, this.x, this.y, TILE, TILE);
            Draw.alpha(1);
            Lines.stroke((2 * f + 0.1) * this.heat);
            Lines.square(this.x, this.y, Math.max(0, Mathf.clamp(2 - f * 2) * TILE / 2 - f - 0.2));
            Draw.reset();
        },

        acceptItem(source, item) {
            return acceptsBoostItem(item) && this.items != null && this.items.get(item) < blockType.itemCapacity;
        },

        acceptStack(item, amount, source) {
            return acceptsBoostItem(item) && this.items != null ? Math.min(amount, blockType.itemCapacity - this.items.get(item)) : 0;
        },

        write(write) {
            this.super$write(write);
            write.f(boostTimer);
            for (let i = 0; i < active.length; i++) write.f(active[i]);
        },

        read(read, revision) {
            this.super$read(read, revision);
            boostTimer = read.f();
            for (let i = 0; i < active.length; i++) active[i] = read.f();
        },
    }, blockType);
});

module.exports = blockType;
