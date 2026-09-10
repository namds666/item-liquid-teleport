const lib = require("lib");

const TILE = Vars.tilesize;
const SPAWN_TIME = 300;
const CIRCLE_RADIUS = 3 * TILE;
const DROP_RANGE = 40;
const ORE_REFIND = 60;
const MAX_TIER = 4;

const PATH_CAP = 0, PATH_SPEED = 1, PATH_MINE = 2, PATH_CAPACITY = 3, PATH_TIER = 4;
const PATHS = [
    { key: "cap",      values: [5, 7, 9, 12, 15] },
    { key: "speed",    values: [1.5, 1.8, 2.1, 2.4, 2.8] },
    { key: "mine",     values: [0.5, 1.0, 1.75, 2.75, 4.0] },
    { key: "capacity", values: [20, 30, 40, 55, 70] },
    { key: "tier",     values: [1, 2, 3, 4] },
];
const STAT_COSTS = [
    ItemStack.with(Items.titanium, 150, Items.silicon, 80),
    ItemStack.with(Items.thorium, 150, Items.silicon, 120),
    ItemStack.with(Items.plastanium, 120, Items.thorium, 100),
    ItemStack.with(Items.phaseFabric, 80, Items.surgeAlloy, 60),
];
const TIER_COSTS = [
    ItemStack.with(Items.titanium, 100, Items.graphite, 100),
    ItemStack.with(Items.thorium, 200, Items.silicon, 150),
    ItemStack.with(Items.plastanium, 150, Items.phaseFabric, 60),
];

function upgradeCost(path, level) {
    let table = path == PATH_TIER ? TIER_COSTS : STAT_COSTS;
    return level < table.length && level < PATHS[path].values.length - 1 ? table[level] : null;
}

function bundle(key, a, b) {
    let full = "outpost." + key;
    if (!Core.bundle.has(full)) return key;
    if (a === undefined) return Core.bundle.get(full);
    return b === undefined ? Core.bundle.format(full, a) : Core.bundle.format(full, a, b);
}

let oreCache = null;
function oreItems() {
    if (oreCache != null) return oreCache;
    let seen = {};
    let out = [];
    Vars.content.blocks().each(cons(b => {
        if (!(b instanceof Floor) || b.wallOre || b.itemDrop == null) return;
        let item = b.itemDrop;
        if (item.hardness > MAX_TIER || seen[item.id]) return;
        seen[item.id] = true;
        out.push(item);
    }));
    out.sort((a, b) => a.hardness != b.hardness ? a.hardness - b.hardness : a.id - b.id);
    oreCache = out;
    return out;
}

const droneType = extend(UnitType, "outpost-drone", {});
droneType.constructor = prov(() => UnitEntity.create());
droneType.flying = true;
droneType.lowAltitude = true;
droneType.drag = 0.05;
droneType.accel = 0.08;
droneType.speed = PATHS[PATH_SPEED].values[0];
droneType.rotateSpeed = 15;
droneType.health = 400;
droneType.hitSize = 9;
droneType.engineOffset = 6.5;
droneType.mineTier = MAX_TIER;
droneType.mineSpeed = PATHS[PATH_MINE].values[0];
droneType.itemCapacity = PATHS[PATH_CAPACITY].values[PATHS[PATH_CAPACITY].values.length - 1];
droneType.mineWalls = false;
droneType.mineFloor = true;
droneType.useUnitCap = false;
droneType.playerControllable = false;
droneType.logicControllable = false;
droneType.isEnemy = false;
droneType.buildSpeed = 0;
droneType.alwaysUnlocked = true;
lib.enableAllEnvironments(droneType);

function makeDroneAI(initialOutpost) {
    let outpost = initialOutpost;
    let mining = true;
    let ore = null;
    let oreTimer = ORE_REFIND;
    const vec = new Vec2();

    return new JavaAdapter(AIController, {
        setOutpost(build) { outpost = build; },

        moveToSpeed(target, circleLength, smooth, speed) {
            const unit = this.unit;
            vec.set(target).sub(unit);
            let length = Mathf.clamp((unit.dst(target) - circleLength) / smooth, -1, 1);
            vec.setLength(speed * length);
            if (length < -0.5) vec.rotate(180);
            else if (length < 0) vec.setZero();
            if (vec.isNaN() || vec.isInfinite() || vec.isZero()) return;
            unit.movePref(vec);
        },

        updateMovement() {
            const unit = this.unit;
            if (outpost != null && !outpost.isValid()) outpost = null;
            if (outpost == null) { unit.mineTile = null; return; }

            const stats = outpost.droneStats();
            const core = unit.closestCore();
            const item = outpost.targetItem();

            if (unit.mineTile != null && !unit.validMine(unit.mineTile)) unit.mineTile = null;
            if (unit.mineTile != null) unit.mineTimer += Time.delta * Math.max(0, stats.mineSpeed - droneType.mineSpeed);

            if (core == null || (item == null && unit.stack.amount == 0)) {
                unit.mineTile = null;
                mining = true;
                this.circle(outpost, CIRCLE_RADIUS, stats.speed);
                return;
            }

            if (mining && item != null) {
                if (core.acceptStack(item, 1, unit) == 0) {
                    unit.mineTile = null;
                    this.circle(outpost, CIRCLE_RADIUS, stats.speed);
                    return;
                }
                if (unit.stack.amount >= stats.capacity || (unit.stack.amount > 0 && unit.stack.item != item) || !unit.acceptsItem(item)) {
                    mining = false;
                } else {
                    oreTimer += Time.delta;
                    if (ore == null || oreTimer >= ORE_REFIND || ore.block() != Blocks.air || ore.drop() != item) {
                        oreTimer = 0;
                        ore = Vars.indexer.findClosestOre(outpost.x, outpost.y, item);
                    }
                    if (ore == null) {
                        unit.mineTile = null;
                        this.circle(outpost, CIRCLE_RADIUS, stats.speed);
                        return;
                    }
                    this.moveToSpeed(ore, droneType.mineRange / 2, 20, stats.speed);
                    if (unit.within(ore, droneType.mineRange) && unit.validMine(ore)) unit.mineTile = ore;
                    return;
                }
            }

            unit.mineTile = null;
            if (unit.stack.amount == 0) { mining = true; return; }
            if (unit.within(core, DROP_RANGE)) {
                if (core.acceptStack(unit.stack.item, unit.stack.amount, unit) > 0) {
                    Call.transferItemTo(unit, unit.stack.item, unit.stack.amount, unit.x, unit.y, core);
                }
                unit.clearItem();
                mining = true;
                return;
            }
            this.moveToSpeed(core, DROP_RANGE / 2, 30, stats.speed);
        }
    });
}

droneType.aiController = prov(() => makeDroneAI(null));
droneType.controller = lib.func(u => makeDroneAI(null));

const blockType = extend(Block, "outpost", {
    load() {
        this.super$load();
        this.region = lib.loadRegion("outpost");
    },

    setStats() {
        this.super$setStats();
        this.stats.add(Stat.productionTime, SPAWN_TIME / 60, StatUnit.seconds);
        this.stats.add(Stat.output, droneType.emoji() + " " + droneType.localizedName);
    },

    setBars() {
        this.super$setBars();
        this.addBar("units", lib.func(e => new Bar(
            prov(() => bundle("bar.units", e.unitCount(), e.unitCap())),
            prov(() => Pal.power),
            floatp(() => e.unitCount() / e.unitCap())
        )));
        this.addBar("progress", lib.func(e => new Bar(
            prov(() => Core.bundle.get("bar.progress")),
            prov(() => Pal.ammo),
            floatp(() => e.spawnFrac())
        )));
    }
});

blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked = true;
blockType.category = Category.production;
blockType.size = 3;
blockType.health = 480;
blockType.update = true;
blockType.solid = true;
blockType.configurable = true;
blockType.requirements = ItemStack.with(Items.copper, 60, Items.lead, 70, Items.graphite, 40, Items.silicon, 20);
lib.enableAllEnvironments(blockType);

blockType.config(Item, lib.cons2((build, item) => build.setSelectedItem(item)));
blockType.configClear(build => build.setSelectedItem(null));
blockType.config(java.lang.Integer, lib.cons2((build, path) => build.tryUpgrade(path | 0)));

blockType.buildType = prov(() => {
    let item = null;
    let levels = [0, 0, 0, 0, 0];
    let progress = 0;
    let units = [];
    let pendingIds = null;

    function pruneUnits() {
        units = units.filter(u => !u.dead && u.isAdded());
    }

    return extend(Building, {
        setSelectedItem(v) { item = v; },
        selectedItem() { return item; },
        levelOf(path) { return levels[path]; },
        mineTier() { return PATHS[PATH_TIER].values[levels[PATH_TIER]]; },
        unitCap() { return PATHS[PATH_CAP].values[levels[PATH_CAP]]; },
        unitCount() { return units.length; },
        spawnFrac() { return units.length >= this.unitCap() ? 0 : Mathf.clamp(progress / SPAWN_TIME); },
        droneStats() {
            return {
                speed: PATHS[PATH_SPEED].values[levels[PATH_SPEED]],
                mineSpeed: PATHS[PATH_MINE].values[levels[PATH_MINE]],
                capacity: PATHS[PATH_CAPACITY].values[levels[PATH_CAPACITY]],
                tier: this.mineTier()
            };
        },
        oreLocked() { return item != null && item.hardness > this.mineTier(); },
        oreMissing() { return item != null && !this.oreLocked() && !Vars.indexer.hasOre(item); },
        targetItem() {
            return item != null && !this.oreLocked() && Vars.indexer.hasOre(item) ? item : null;
        },
        upgradeCost(path) { return upgradeCost(path, levels[path]); },
        canUpgrade(path) {
            let cost = this.upgradeCost(path);
            let core = this.team.core();
            return cost != null && core != null && core.items.has(cost);
        },
        tryUpgrade(path) {
            if (path < 0 || path >= PATHS.length || !this.canUpgrade(path)) return;
            this.team.core().items.remove(this.upgradeCost(path));
            levels[path]++;
        },

        adoptUnit(unit) {
            unit.controller(makeDroneAI(this));
            units.push(unit);
        },
        resolvePending() {
            for (let i = 0; i < pendingIds.length; i++) {
                let unit = Groups.unit.getByID(pendingIds[i]);
                if (unit != null && unit.type == droneType && unit.team == this.team && !unit.dead) this.adoptUnit(unit);
            }
            pendingIds = null;
        },
        spawnUnit() {
            let unit = droneType.create(this.team);
            unit.set(this.x, this.y);
            unit.rotation = 90;
            unit.add();
            this.adoptUnit(unit);
            Fx.spawn.at(this.x, this.y);
            Events.fire(new EventType.UnitCreateEvent(unit, this, null));
        },

        updateTile() {
            if (pendingIds != null) this.resolvePending();
            pruneUnits();
            if (units.length >= this.unitCap()) { progress = 0; return; }
            progress += this.edelta();
            if (progress >= SPAWN_TIME) {
                progress = 0;
                if (!Vars.net.client()) this.spawnUnit();
            }
        },

        onRemoved() {
            this.super$onRemoved();
            if (!Vars.net.client()) {
                for (let i = 0; i < units.length; i++) if (!units[i].dead) units[i].kill();
            }
            units = [];
        },

        status() {
            if (item == null) return BlockStatus.noOutput;
            if (this.targetItem() == null) return BlockStatus.noInput;
            return BlockStatus.active;
        },

        drawStatus() {
            let brcx = this.x + (blockType.size * TILE / 2) - (TILE / 2);
            let brcy = this.y - (blockType.size * TILE / 2) + (TILE / 2);
            Draw.z(Layer.power + 1);
            Draw.color(Pal.gray);
            Fill.square(brcx, brcy, 2.5, 45);
            Draw.color(this.status().color);
            Fill.square(brcx, brcy, 1.5, 45);
            Draw.color();
        },

        draw() {
            this.super$draw();
            this.drawStatus();
            if (item == null) return;
            Draw.z(Layer.block + 0.1);
            Draw.rect(item.fullIcon, this.x, this.y, 6, 6);
            if (this.targetItem() == null) {
                Draw.color(Pal.remove);
                Draw.alpha(0.6 + Mathf.absin(Time.time, 6, 0.4));
                Draw.rect(Icon.warning.getRegion(), this.x, this.y + TILE, 8, 8);
            }
            Draw.reset();
        },

        buildConfiguration(table) {
            const build = this;
            const self = this;
            let snapshot = "";
            const state = () => levels.join(",") + "|" + (item == null ? -1 : item.id);

            function costTable(c, path) {
                c.clearChildren();
                let cost = self.upgradeCost(path);
                if (cost == null) { c.add(bundle("maxed")).color(Pal.accent); return; }
                let core = self.team.core();
                for (let i = 0; i < cost.length; i++) {
                    let stack = cost[i];
                    let has = core != null && core.items.has(stack.item, stack.amount);
                    c.image(stack.item.uiIcon).size(18).padRight(2);
                    c.add(stack.amount + "").color(has ? Color.white : Pal.remove).padRight(8);
                }
            }

            function valueText(path) {
                let value = PATHS[path].values[levels[path]];
                if (path == PATH_TIER) return bundle("value.tier", value);
                return bundle("value." + PATHS[path].key, Strings.autoFixed(value, 2));
            }

            function rebuild() {
                snapshot = state();
                table.clearChildren();
                table.background(Styles.black6);
                table.margin(8);
                table.table(cons(t => {
                    t.add(bundle("ore")).left().colspan(6).row();
                    let ores = oreItems();
                    for (let i = 0; i < ores.length; i++) {
                        let ore = ores[i];
                        let locked = ore.hardness > self.mineTier();
                        let cell = t.button(new TextureRegionDrawable(ore.uiIcon), Styles.clearTogglei, 24, run(() => {
                            if (locked) return;
                            build.configure(item == ore ? null : ore);
                        }));
                        cell.size(40).checked(boolf(b => item == ore));
                        cell.tooltip(locked ? bundle("locked", ore.localizedName, ore.hardness) : ore.localizedName);
                        if (locked) cell.get().getImage().setColor(Color.darkGray);
                        if (i % 6 == 5) t.row();
                    }
                })).left().row();
                table.table(cons(t => {
                    t.defaults().padTop(3).padBottom(3);
                    for (let p = 0; p < PATHS.length; p++) {
                        let path = p;
                        t.table(Styles.black3, cons(row => {
                            row.margin(4).left();
                            row.add(bundle("path." + PATHS[path].key)).left().minWidth(120).padRight(6);
                            row.label(prov(() => (levels[path] + 1) + "/" + PATHS[path].values.length + "  " + valueText(path))).left().minWidth(130).padRight(8);
                            row.table(cons(c => costTable(c, path))).left().minWidth(120).padRight(6);
                            let btn = row.button(bundle("upgrade"), run(() => build.configure(lib.int(path))))
                                .minWidth(120).height(40).disabled(boolf(b => !self.canUpgrade(path)));
                            btn.get().getLabel().setWrap(false);
                        })).growX().row();
                    }
                })).left().row();
            }

            rebuild();
            table.update(run(() => { if (state() != snapshot) rebuild(); }));
        },

        config() { return item; },

        version() { return 1; },

        write(write) {
            this.super$write(write);
            write.s(item == null ? -1 : item.id);
            write.f(progress);
            write.b(PATHS.length);
            for (let i = 0; i < PATHS.length; i++) write.b(levels[i]);
            pruneUnits();
            write.s(units.length);
            for (let i = 0; i < units.length; i++) write.i(units[i].id);
        },

        read(read, revision) {
            this.super$read(read, revision);
            let id = read.s();
            item = id < 0 ? null : Vars.content.items().get(id);
            progress = read.f();
            let pathCount = read.b();
            for (let i = 0; i < pathCount; i++) {
                let level = read.b();
                if (i < PATHS.length) levels[i] = Mathf.clamp(level, 0, PATHS[i].values.length - 1);
            }
            let count = read.s();
            pendingIds = [];
            for (let i = 0; i < count; i++) pendingIds.push(read.i());
            units = [];
        }
    });
});

module.exports = blockType;
