const lib = require("lib");
const boostRules = require("chrono-boost-rules");

const DEFAULT_RADIUS = 8;
const TILE_INTERVAL = 30;
const RADIUS_LEVELS = [2, 4, 6, 8, 12, 16, 24, 32];

let topRegion, bottomRegion, rotatorRegion;

function liquidFloor(liquid) {
    if (liquid == Liquids.water) return Blocks.water;
    if (liquid == Liquids.slag) return Blocks.slag;
    if (liquid == Liquids.oil) return Blocks.tar;
    if (liquid == Liquids.cryofluid) return Blocks.cryofluid;
    return null;
}

function liquidCost(liquid) {
    for (let i = 0; i < boostRules.liquidBoosters.length; i++) {
        let b = boostRules.liquidBoosters[i];
        if (b.liquid == liquid) return b.amount;
    }
    return 0;
}

function validRadius(value) {
    let out = parseInt(value, 10);
    if (isNaN(out)) return DEFAULT_RADIUS;
    return Math.max(1, Math.min(64, out));
}

function tilerConfig(liquidId, radius) {
    let seq = new IntSeq(2);
    seq.add(liquidId == null ? -1 : liquidId);
    seq.add(validRadius(radius));
    return seq;
}

function intervalLabel(ticks) {
    return Strings.autoFixed(ticks / 60, ticks % 60 == 0 ? 0 : 2) + "s";
}

function addOffset(out, x, y, limit2) {
    if (x == 0 && y == 0) return;
    if (x * x + y * y > limit2) return;
    out.push({ x: x, y: y });
}

function ringOffsets(radius) {
    let out = [];
    let limit2 = radius * radius;

    for (let r = 1; r <= radius; r++) {
        for (let y = 0; y <= r; y++) addOffset(out, r, y, limit2);
        for (let x = r - 1; x >= -r; x--) addOffset(out, x, r, limit2);
        for (let y = r - 1; y >= -r; y--) addOffset(out, -r, y, limit2);
        for (let x = -r + 1; x <= r; x++) addOffset(out, x, -r, limit2);
        for (let y = -r + 1; y < 0; y++) addOffset(out, r, y, limit2);
    }

    return out;
}

const blockType = extend(Block, "chrono-liquid-tiler", {
    load() {
        this.super$load();
        this.region = lib.loadRegion("chrono-liquid-tiler");
        topRegion = lib.loadRegion("chrono-liquid-tiler-top");
        bottomRegion = lib.loadRegion("chrono-liquid-tiler-bottom");
        rotatorRegion = lib.loadRegion("chrono-liquid-tiler-rotator");
    },

    setStats() {
        this.super$setStats();
        this.stats.add(Stat.range, DEFAULT_RADIUS, StatUnit.blocks);
        this.stats.add(Stat.productionTime, intervalLabel(TILE_INTERVAL));
    },

    setBars() {
        this.super$setBars();
        this.barMap.put("liquid", lib.func(e => new Bar(
            prov(() => e.liquidName()),
            prov(() => e.selectedLiquidColor()),
            floatp(() => e.liquidProgress())
        )));
        this.addBar("progress", lib.func(e => new Bar(
            prov(() => Core.bundle.get("bar.progress")),
            prov(() => Pal.ammo),
            floatp(() => e.progressFrac())
        )));
    }
});

blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked = true;
blockType.category = Category.crafting;
blockType.size = 1;
blockType.health = 2147483647;
blockType.buildCost = 0.001;
blockType.update = true;
blockType.solid = true;
blockType.hasLiquids = true;
blockType.hasPower = false;
blockType.configurable = true;
blockType.saveConfig = true;
blockType.liquidCapacity = 10;
blockType.noUpdateDisabled = true;
blockType.requirements = ItemStack.with();
lib.enableAllEnvironments(blockType);

blockType.config(IntSeq, lib.cons2((tile, seq) => {
    tile.setTilerConfig(
        seq.size > 0 ? seq.get(0) : -1,
        seq.size > 1 ? seq.get(1) : DEFAULT_RADIUS
    );
}));
blockType.config(Liquid, lib.cons2((tile, liquid) => {
    tile.setTilerConfig(liquid == null ? -1 : liquid.id, tile.radiusValue());
}));
blockType.configClear(tile => { tile.setTilerConfig(-1, DEFAULT_RADIUS); });

blockType.buildType = prov(() => {
    let selectedLiquid = null;
    let radius = DEFAULT_RADIUS;
    let progress = 0;
    let cursor = 0;
    let warmup = 0;
    let rotateDeg = 0;
    let paintedDelay = 0;

    return extend(Building, {
        radiusValue() {
            return radius;
        },

        setTilerConfig(liquidId, radiusValue) {
            let liquids = Vars.content.liquids();
            selectedLiquid = (liquidId == null || liquidId < 0 || liquidId >= liquids.size) ? null : liquids.get(liquidId);
            radius = validRadius(radiusValue);
            progress = 0;
            cursor = 0;
        },

        selectedFloor() {
            return liquidFloor(selectedLiquid);
        },

        selectedCost() {
            return liquidCost(selectedLiquid);
        },

        active() {
            return this.enabled && selectedLiquid != null && this.selectedFloor() != null && this.selectedCost() > 0;
        },

        autoSelectLiquid() {
            if (selectedLiquid != null || this.liquids == null) return;
            for (let i = 0; i < boostRules.liquidBoosters.length; i++) {
                let liquid = boostRules.liquidBoosters[i].liquid;
                if (liquidFloor(liquid) != null && this.liquids.get(liquid) > 0.001) {
                    selectedLiquid = liquid;
                    return;
                }
            }
        },

        nextTile() {
            let offsets = ringOffsets(radius);
            if (offsets.length == 0) return null;
            let floor = this.selectedFloor();

            for (let i = 0; i < offsets.length; i++) {
                let idx = (cursor + i) % offsets.length;
                let off = offsets[idx];
                let tile = Vars.world.tile(this.tile.x + off.x, this.tile.y + off.y);
                if (tile == null) continue;
                if (tile.floor() == floor) continue;
                cursor = (idx + 1) % offsets.length;
                return tile;
            }

            return null;
        },

        paintOne() {
            if (Vars.net.client()) return false;
            if (!this.active() || this.liquids == null) return false;
            let cost = this.selectedCost();
            if (this.liquids.get(selectedLiquid) < cost) return false;

            let target = this.nextTile();
            if (target == null) return false;

            this.liquids.remove(selectedLiquid, cost);
            target.setFloorNet(this.selectedFloor());
            paintedDelay = 20;
            return true;
        },

        updateTile() {
            this.autoSelectLiquid();
            let active = this.active();
            if (active) {
                progress += this.edelta();
                while (progress >= TILE_INTERVAL) {
                    if (!this.paintOne()) {
                        progress = Math.min(progress, TILE_INTERVAL);
                        break;
                    }
                    progress -= TILE_INTERVAL;
                }
            } else {
                progress = 0;
            }

            warmup = Mathf.lerpDelta(warmup, active ? 1 : 0, 0.05);
            if (warmup > 0.001) rotateDeg -= paintedDelay > 0 ? 2 : 0.25;
            paintedDelay = Math.max(0, paintedDelay - Time.delta);
        },

        draw() {
            this.super$draw();
            Draw.alpha(warmup);
            Draw.rect(bottomRegion, this.x, this.y);
            Draw.color(selectedLiquid != null && selectedLiquid.color != null ? selectedLiquid.color : Color.clear);
            Draw.rect(rotatorRegion, this.x, this.y, rotateDeg);
            Draw.alpha(1);
            Draw.rect(topRegion, this.x, this.y);
            Draw.color(selectedLiquid != null && selectedLiquid.color != null ? selectedLiquid.color : Color.clear);
            Draw.rect("unloader-center", this.x, this.y);
            Draw.reset();
        },

        drawSelect() {
            Drawf.dashCircle(this.x, this.y, radius * Vars.tilesize, selectedLiquid != null && selectedLiquid.color != null ? selectedLiquid.color : Pal.accent);
        },

        buildConfiguration(table) {
            table.table(cons(t => {
                t.add("Liquid").left().row();
                ItemSelection.buildTable(t, Vars.content.liquids(), prov(() => selectedLiquid), cons(v => {
                    this.configure(tilerConfig(v == null ? -1 : v.id, radius));
                }));
            })).row();

            table.table(cons(t => {
                t.add("Radius").left().row();
                for (let i = 0; i < RADIUS_LEVELS.length; i++) {
                    let value = RADIUS_LEVELS[i];
                    t.button(value + "b", run(() => {
                        this.configure(tilerConfig(selectedLiquid == null ? -1 : selectedLiquid.id, value));
                    })).size(58, 40).pad(2);
                    if (i == 3) t.row();
                }
            })).row();
        },

        config() {
            return tilerConfig(selectedLiquid == null ? -1 : selectedLiquid.id, radius);
        },

        chronoConsumesLiquid(liquid) {
            if (selectedLiquid == null) return liquidFloor(liquid) != null;
            return liquid == selectedLiquid && liquidFloor(liquid) != null;
        },

        chronoConsumesAnyLiquid() {
            if (selectedLiquid != null) return liquidFloor(selectedLiquid) != null;
            for (let i = 0; i < boostRules.liquidBoosters.length; i++) {
                let liquid = boostRules.liquidBoosters[i].liquid;
                if (liquidFloor(liquid) != null) return true;
            }
            return false;
        },

        acceptLiquid(source, liquid) {
            if (this.liquids == null || this.liquids.get(liquid) >= blockType.liquidCapacity - 0.001) return false;
            if (selectedLiquid == null) return liquidFloor(liquid) != null;
            return liquid == selectedLiquid && liquidFloor(liquid) != null;
        },

        liquidName() {
            return selectedLiquid == null ? Core.bundle.get("bar.liquid") : selectedLiquid.localizedName + " / tile";
        },

        selectedLiquidColor() {
            return selectedLiquid == null ? Pal.gray : (selectedLiquid.barColor != null ? selectedLiquid.barColor : selectedLiquid.color);
        },

        liquidProgress() {
            let cost = this.selectedCost();
            if (selectedLiquid == null || cost <= 0 || this.liquids == null) return 0;
            return Mathf.clamp(this.liquids.get(selectedLiquid) / cost);
        },

        progressFrac() {
            return Mathf.clamp(progress / TILE_INTERVAL);
        },

        version() {
            return 2;
        },

        write(write) {
            this.super$write(write);
            write.s(selectedLiquid == null ? -1 : selectedLiquid.id);
            write.s(radius);
            write.f(progress);
            write.i(cursor);
        },

        read(read, revision) {
            this.super$read(read, revision);
            let liquidId = read.s();
            this.setTilerConfig(liquidId, read.s());
            if (revision < 2) read.s();
            progress = read.f();
            cursor = read.i();
        }
    });
});

module.exports = blockType;
