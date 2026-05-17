const lib = require("lib");

const DEFAULT_RADIUS = 8;
const TILE_INTERVAL = 30;
const RADIUS_LEVELS = [2, 4, 6, 8, 12, 16, 24, 32];
const TARGET_OVERLAY = 0;
const TARGET_FLOOR = 1;

let topRegion, bottomRegion, rotatorRegion;

const tileTargets = [
    { item: Items.copper, type: TARGET_OVERLAY, block: Blocks.oreCopper },
    { item: Items.lead, type: TARGET_OVERLAY, block: Blocks.oreLead },
    { item: Items.scrap, type: TARGET_OVERLAY, block: Blocks.oreScrap },
    { item: Items.coal, type: TARGET_OVERLAY, block: Blocks.oreCoal },
    { item: Items.titanium, type: TARGET_OVERLAY, block: Blocks.oreTitanium },
    { item: Items.thorium, type: TARGET_OVERLAY, block: Blocks.oreThorium },
    { item: Items.beryllium, type: TARGET_OVERLAY, block: Blocks.oreBeryllium },
    { item: Items.tungsten, type: TARGET_OVERLAY, block: Blocks.oreTungsten },
    { item: Items.sand, type: TARGET_FLOOR, block: Blocks.sand },
    { item: Items.sand, type: TARGET_FLOOR, block: Blocks.darksand },
    { item: Items.sporePod, type: TARGET_FLOOR, block: Blocks.sporeMoss },
    { item: Items.surgeAlloy, type: TARGET_FLOOR, block: Blocks.metalFloor5 }
];

function targetAvailable(target) {
    return target != null && target.item != null && target.block != null;
}

function itemTarget(item) {
    for (let i = 0; i < tileTargets.length; i++) {
        let target = tileTargets[i];
        if (targetAvailable(target) && target.item == item) return target;
    }
    return null;
}

function targetFromConfig(item, type, blockId) {
    let fallback = null;
    for (let i = 0; i < tileTargets.length; i++) {
        let target = tileTargets[i];
        if (!targetAvailable(target) || target.item != item) continue;
        if (fallback == null) fallback = target;
        if (type != null && blockId != null && target.type == type && target.block.id == blockId) return target;
    }
    return fallback;
}

function targetLabel(target) {
    if (target == null || target.block == null) return Core.bundle.get("bar.items");
    return target.block.localizedName;
}

function supportedItems() {
    let seq = new Seq();
    let items = Vars.content.items();
    for (let i = 0; i < items.size; i++) {
        let item = items.get(i);
        if (itemTarget(item) != null) seq.add(item);
    }
    return seq;
}

function validRadius(value) {
    let out = parseInt(value, 10);
    if (isNaN(out)) return DEFAULT_RADIUS;
    return Math.max(1, Math.min(64, out));
}

function tilerConfig(itemId, radius, target) {
    let seq = new IntSeq(4);
    seq.add(itemId == null ? -1 : itemId);
    seq.add(validRadius(radius));
    seq.add(target == null ? -1 : target.type);
    seq.add(target == null || target.block == null ? -1 : target.block.id);
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

const blockType = extend(StorageBlock, "chrono-item-tiler", {
    load() {
        this.super$load();
        this.region = lib.loadRegion("chrono-item-tiler");
        topRegion = lib.loadRegion("chrono-item-tiler-top");
        bottomRegion = lib.loadRegion("chrono-item-tiler-bottom");
        rotatorRegion = lib.loadRegion("chrono-item-tiler-rotator");
    },

    setStats() {
        this.super$setStats();
        this.stats.add(Stat.range, DEFAULT_RADIUS, StatUnit.blocks);
        this.stats.add(Stat.productionTime, intervalLabel(TILE_INTERVAL));
    },

    setBars() {
        this.super$setBars();
        this.addBar("item", lib.func(e => new Bar(
            prov(() => e.itemName()),
            prov(() => e.selectedItemColor()),
            floatp(() => e.itemProgress())
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
blockType.hasItems = true;
blockType.configurable = true;
blockType.saveConfig = true;
blockType.itemCapacity = 10;
blockType.noUpdateDisabled = true;
blockType.requirements = ItemStack.with();
lib.enableAllEnvironments(blockType);

blockType.config(IntSeq, lib.cons2((tile, seq) => {
    tile.setTilerConfig(
        seq.size > 0 ? seq.get(0) : -1,
        seq.size > 1 ? seq.get(1) : DEFAULT_RADIUS,
        seq.size > 2 ? seq.get(2) : null,
        seq.size > 3 ? seq.get(3) : null
    );
}));
blockType.config(Item, lib.cons2((tile, item) => {
    tile.setTilerConfig(item == null ? -1 : item.id, tile.radiusValue(), null, null);
}));
blockType.configClear(tile => { tile.setTilerConfig(-1, DEFAULT_RADIUS); });

blockType.buildType = prov(() => {
    let selectedItem = null;
    let radius = DEFAULT_RADIUS;
    let selectedTarget = null;
    let progress = 0;
    let cursor = 0;
    let warmup = 0;
    let rotateDeg = 0;
    let paintedDelay = 0;

    function acceptsTilerItem(the, item) {
        if (the.items == null || the.items.get(item) >= blockType.itemCapacity) return false;
        if (selectedItem == null) return itemTarget(item) != null;
        return item == selectedItem && selectedTarget != null;
    }

    return new JavaAdapter(StorageBlock.StorageBuild, {
        radiusValue() {
            return radius;
        },

        setTilerConfig(itemId, radiusValue, targetType, targetBlockId) {
            let items = Vars.content.items();
            selectedItem = (itemId == null || itemId < 0 || itemId >= items.size) ? null : items.get(itemId);
            radius = validRadius(radiusValue);
            selectedTarget = targetFromConfig(selectedItem, targetType, targetBlockId);
            progress = 0;
            cursor = 0;
        },

        selectedOverlay() {
            return selectedTarget != null && selectedTarget.type == TARGET_OVERLAY ? selectedTarget.block : null;
        },

        selectedFloor() {
            return selectedTarget != null && selectedTarget.type == TARGET_FLOOR ? selectedTarget.block : null;
        },

        active() {
            return this.enabled && selectedItem != null && selectedTarget != null;
        },

        autoSelectItem() {
            if (selectedItem != null || this.items == null) return;
            let items = supportedItems();
            for (let i = 0; i < items.size; i++) {
                let item = items.get(i);
                if (this.items.get(item) > 0) {
                    selectedItem = item;
                    selectedTarget = itemTarget(item);
                    return;
                }
            }
        },

        nextTile() {
            let offsets = ringOffsets(radius);
            if (offsets.length == 0) return null;
            let overlay = this.selectedOverlay();
            let floor = this.selectedFloor();

            for (let i = 0; i < offsets.length; i++) {
                let idx = (cursor + i) % offsets.length;
                let off = offsets[idx];
                let tile = Vars.world.tile(this.tile.x + off.x, this.tile.y + off.y);
                if (tile == null) continue;
                if (overlay != null && tile.overlay() == overlay) continue;
                if (floor != null && tile.floor() == floor) continue;
                cursor = (idx + 1) % offsets.length;
                return tile;
            }

            return null;
        },

        paintOne() {
            if (Vars.net.client()) return false;
            if (!this.active() || this.items == null) return false;
            if (this.items.get(selectedItem) < 1) return false;

            let target = this.nextTile();
            if (target == null) return false;

            this.items.remove(selectedItem, 1);
            if (selectedTarget.type == TARGET_FLOOR) target.setFloorNet(this.selectedFloor());
            else target.setOverlayNet(this.selectedOverlay());
            paintedDelay = 20;
            return true;
        },

        updateTile() {
            this.autoSelectItem();
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
            Draw.color(selectedItem != null && selectedItem.color != null ? selectedItem.color : Color.clear);
            Draw.rect(rotatorRegion, this.x, this.y, rotateDeg);
            Draw.alpha(1);
            Draw.rect(topRegion, this.x, this.y);
            Draw.color(selectedItem != null && selectedItem.color != null ? selectedItem.color : Color.clear);
            Draw.rect("unloader-center", this.x, this.y);
            Draw.reset();
        },

        drawSelect() {
            Drawf.dashCircle(this.x, this.y, radius * Vars.tilesize, selectedItem != null && selectedItem.color != null ? selectedItem.color : Pal.accent);
        },

        buildConfiguration(table) {
            table.table(cons(t => {
                t.add("Item").left().row();
                ItemSelection.buildTable(t, supportedItems(), prov(() => selectedItem), cons(v => {
                    this.configure(tilerConfig(v == null ? -1 : v.id, radius, itemTarget(v)));
                }));
            })).row();

            let options = [];
            for (let i = 0; i < tileTargets.length; i++) {
                let target = tileTargets[i];
                if (targetAvailable(target) && target.item == selectedItem) options.push(target);
            }
            if (options.length > 1) {
                table.table(cons(t => {
                    t.add("Tile").left().row();
                    for (let i = 0; i < options.length; i++) {
                        let target = options[i];
                        t.button(targetLabel(target), run(() => {
                            this.configure(tilerConfig(selectedItem == null ? -1 : selectedItem.id, radius, target));
                        })).size(116, 40).pad(2);
                        if (i % 2 == 1) t.row();
                    }
                })).row();
            }

            table.table(cons(t => {
                t.add("Radius").left().row();
                for (let i = 0; i < RADIUS_LEVELS.length; i++) {
                    let value = RADIUS_LEVELS[i];
                    t.button(value + "b", run(() => {
                        this.configure(tilerConfig(selectedItem == null ? -1 : selectedItem.id, value, selectedTarget));
                    })).size(58, 40).pad(2);
                    if (i == 3) t.row();
                }
            })).row();
        },

        config() {
            return tilerConfig(selectedItem == null ? -1 : selectedItem.id, radius, selectedTarget);
        },

        itemName() {
            return selectedItem == null ? Core.bundle.get("bar.items") : selectedItem.localizedName + " -> " + targetLabel(selectedTarget);
        },

        selectedItemColor() {
            return selectedItem == null ? Pal.gray : selectedItem.color;
        },

        itemProgress() {
            if (selectedItem == null || this.items == null) return 0;
            return Mathf.clamp(this.items.get(selectedItem));
        },

        progressFrac() {
            return Mathf.clamp(progress / TILE_INTERVAL);
        },

        acceptItem(source, item) {
            return acceptsTilerItem(this, item);
        },

        acceptStack(item, amount, source) {
            if (!acceptsTilerItem(this, item)) return 0;
            return Math.min(amount, this.getMaximumAccepted(item) - this.items.get(item));
        },

        version() {
            return 2;
        },

        write(write) {
            this.super$write(write);
            write.s(selectedItem == null ? -1 : selectedItem.id);
            write.s(radius);
            write.s(selectedTarget == null ? -1 : selectedTarget.type);
            write.s(selectedTarget == null || selectedTarget.block == null ? -1 : selectedTarget.block.id);
            write.f(progress);
            write.i(cursor);
        },

        read(read, revision) {
            this.super$read(read, revision);
            let itemId = read.s();
            let radiusValue = read.s();
            let targetType = revision >= 2 ? read.s() : null;
            let targetBlockId = revision >= 2 ? read.s() : null;
            this.setTilerConfig(itemId, radiusValue, targetType, targetBlockId);
            progress = read.f();
            cursor = read.i();
        }
    }, blockType);
});

module.exports = blockType;
