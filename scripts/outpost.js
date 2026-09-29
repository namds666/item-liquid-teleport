const lib = require("lib");
const oreIndex = require("ore-index");

const TILE = Vars.tilesize;
const SPAWN_TIME = 300;
const CIRCLE_RADIUS = 3 * TILE;
const ORE_REFIND = 60;
const MERGE_CHECK = 120;
const ORPHAN_TIME = 120;

const PATH_CAP = 0, PATH_SPEED = 1, PATH_MINE = 2, PATH_CAPACITY = 3, PATH_TIER = 4, PATH_RANGE = 5, PATH_DROP = 6, PATH_BEAM = 7;
const PATH_KEYS = ["cap", "speed", "mine", "capacity", "tier", "range", "drop", "beam"];
const LEVELS_PER_RANGE_COST = 10;

function linear(start, step, count) {
    let out = [];
    for (let i = 0; i < count; i++) out.push(start + step * i);
    return out;
}

function bundle(key, a, b) {
    let full = "outpost." + key;
    if (!Core.bundle.has(full)) return key;
    if (a === undefined) return Core.bundle.get(full);
    return b === undefined ? Core.bundle.format(full, a) : Core.bundle.format(full, a, b);
}

const oreCaches = {};
function oreItems(maxTier) {
    if (oreCaches[maxTier] != null) return oreCaches[maxTier];
    let seen = {};
    let out = [];
    Vars.content.blocks().each(cons(b => {
        if (!(b instanceof Floor) || b.wallOre || b.itemDrop == null) return;
        let item = b.itemDrop;
        if (item.hardness > maxTier || seen[item.id]) return;
        seen[item.id] = true;
        out.push(item);
    }));
    out.sort((a, b) => a.hardness != b.hardness ? a.hardness - b.hardness : a.id - b.id);
    oreCaches[maxTier] = out;
    return out;
}

function create(cfg) {
const PATHS = PATH_KEYS.map((key, i) => ({ key: key, values: cfg.paths[i] }));
const MAX_TIER = PATHS[PATH_TIER].values[PATHS[PATH_TIER].values.length - 1];

function upgradeCost(path, level) {
    let erekir = Vars.state.rules.planet == Planets.erekir;
    let table = path == PATH_TIER ? (erekir ? cfg.erekirTierCosts : cfg.tierCosts)
        : path == PATH_BEAM ? (erekir ? cfg.erekirBeamCosts : cfg.beamCosts)
        : (erekir ? cfg.erekirStatCosts : cfg.statCosts);
    let index = path == PATH_RANGE || path == PATH_DROP ? Math.floor(level / LEVELS_PER_RANGE_COST) : level;
    return index < table.length && level < PATHS[path].values.length - 1 ? table[index] : null;
}

const droneType = extend(UnitType, cfg.unitName, {
    drawMining(unit) {
        this.super$drawMining(unit);
        let ai = unit.controller();
        if (unit.mineTile != null && ai != null && typeof ai.drawBeams == "function") ai.drawBeams();
    }
});
droneType.constructor = prov(() => UnitEntity.create());
droneType.flying = true;
droneType.lowAltitude = true;
droneType.drag = 0.05;
droneType.accel = 0.08;
droneType.speed = PATHS[PATH_SPEED].values[0];
droneType.rotateSpeed = 15;
droneType.health = cfg.unitHealth;
droneType.hitSize = cfg.hitSize;
droneType.engineOffset = cfg.engineOffset;
droneType.mineTier = Math.max(MAX_TIER, cfg.unitMineTier || 0);
droneType.mineSpeed = PATHS[PATH_MINE].values[0];
droneType.mineRange = Math.max(PATHS[PATH_RANGE].values[PATHS[PATH_RANGE].values.length - 1], cfg.unitMineRange || 0) * TILE;
droneType.itemCapacity = Math.max(PATHS[PATH_CAPACITY].values[PATHS[PATH_CAPACITY].values.length - 1], cfg.unitItemCapacity || 0);
droneType.mineWalls = false;
droneType.mineFloor = true;
droneType.useUnitCap = false;
droneType.playerControllable = false;
droneType.logicControllable = false;
droneType.isEnemy = false;
droneType.buildSpeed = 0;
droneType.alwaysUnlocked = true;
lib.enableAllEnvironments(droneType);

function makeDroneAI(initialOutpost, fixedStats, parentUnit) {
    let outpost = initialOutpost;
    let mining = true;
    let approaching = false;
    let ore = null;
    let oreTimer = ORE_REFIND;
    let orphanTimer = 0;
    let subTimer = 0;
    let beams = [];
    let beamTimer = ORE_REFIND;
    const vec = new Vec2();

    function hasBeam(t) {
        for (let i = 0; i < beams.length; i++) if (beams[i] == t) return true;
        return false;
    }

    // Extra beams each hold a distinct ore tile of the primary's item; rescans are rate-limited.
    function updateBeams(unit, range, want) {
        const tile = unit.mineTile;
        if (tile == null || want <= 1) { beams = []; return; }
        const item = tile.drop();
        let kept = beams.filter(t => t != tile && t.drop() == item && unit.within(t, range) && unit.validMine(t));
        if (kept.length < beams.length) beamTimer = ORE_REFIND;
        beams = kept.slice(0, want - 1);
        beamTimer += Time.delta;
        if (beams.length >= want - 1 || beamTimer < ORE_REFIND) return;
        beamTimer = 0;
        beams = beams.concat(oreIndex.nearby(item, unit.x, unit.y, range, want - 1 - beams.length,
            t => t != tile && !hasBeam(t) && unit.validMine(t)));
    }

    return new JavaAdapter(AIController, {
        setOutpost(build) { outpost = build; },

        activeBeams() { return this.unit == null || this.unit.mineTile == null ? 0 : 1 + beams.length; },

        drawBeams() {
            const unit = this.unit;
            if (unit == null || unit.mineTile == null || beams.length == 0 || !droneType.drawMineBeam) return;
            let focus = droneType.mineBeamOffset + Mathf.absin(Time.time, 1.1, 0.5);
            let px = unit.x + Angles.trnsx(unit.rotation, focus), py = unit.y + Angles.trnsy(unit.rotation, focus);
            Draw.z(Layer.flyingUnit + 0.1);
            Draw.color(Color.lightGray, Color.white, 0.7 + Mathf.absin(Time.time, 0.5, 0.3));
            Draw.alpha(Renderer.unitLaserOpacity);
            for (let i = 0; i < beams.length; i++) {
                let t = beams[i];
                Drawf.laser(droneType.mineLaserRegion, droneType.mineLaserEndRegion, px, py,
                    t.worldx() + Mathf.sin(Time.time + 48 + i * 17, 12, TILE / 8), t.worldy() + Mathf.sin(Time.time + 48 + i * 17, 14, TILE / 8), 0.75);
            }
            Draw.color();
        },

        updateSubs(unit) {
            let want = Math.min(cfg.subDrone.max, outpost.levelOf(cfg.subDrone.path));
            if (outpost.subCountOf(unit) >= want) { subTimer = 0; return; }
            subTimer += Time.delta;
            if (subTimer < cfg.subDrone.spawnTime || Vars.net.client()) return;
            subTimer = 0;
            let type = Vars.content.unit(lib.modName + "-" + cfg.subDrone.unitName);
            if (type == null) return;
            let sub = type.create(unit.team);
            sub.set(unit.x, unit.y);
            sub.rotation = unit.rotation;
            sub.add();
            outpost.adoptSub(sub, unit);
            Fx.spawn.at(unit.x, unit.y);
            Events.fire(new EventType.UnitCreateEvent(sub, outpost, null));
        },

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
            if (parentUnit != null && (parentUnit.dead || !parentUnit.isAdded())) {
                unit.mineTile = null;
                if (!Vars.net.client()) unit.kill();
                return;
            }
            if (outpost == null) {
                unit.mineTile = null;
                orphanTimer += Time.delta;
                if (orphanTimer >= ORPHAN_TIME && !Vars.net.client()) unit.kill();
                return;
            }
            orphanTimer = 0;
            if (cfg.subDrone != null && parentUnit == null) this.updateSubs(unit);

            let stats = outpost.droneStats();
            if (fixedStats != null) stats = {
                speed: stats.speed,
                mineSpeed: fixedStats.mineSpeed,
                capacity: fixedStats.capacity * stats.capacity / PATHS[PATH_CAPACITY].values[0],
                range: fixedStats.range + stats.range - PATHS[PATH_RANGE].values[0],
                dropRange: stats.dropRange,
                tier: stats.tier,
                beams: 1 + outpost.levelOf(PATH_BEAM)
            };
            const core = unit.closestCore();
            const item = outpost.targetItem();

            const range = stats.range * TILE;
            if (unit.mineTile != null && (!unit.validMine(unit.mineTile) || !unit.within(unit.mineTile, range))) unit.mineTile = null;
            updateBeams(unit, range, stats.beams);
            if (unit.mineTile != null) unit.mineTimer += Time.delta * Math.max(0, stats.mineSpeed * (1 + beams.length) - unit.type.mineSpeed);

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
                    // Any spot inside the range is fine; drones only fly in once pushed past it, and stop
                    // well inside so they do not drift in and out at the edge.
                    const settle = Math.max(range - 2 * TILE, range / 2);
                    if (!unit.within(ore, range)) approaching = true;
                    else if (unit.within(ore, settle)) approaching = false;
                    if (approaching) this.moveToSpeed(ore, settle - TILE, 20, stats.speed);
                    if (unit.within(ore, range) && unit.validMine(ore)) unit.mineTile = ore;
                    return;
                }
            }

            unit.mineTile = null;
            if (unit.stack.amount == 0) { mining = true; return; }
            const dropRange = stats.dropRange * TILE + core.block.size * TILE / 2;
            if (unit.within(core, dropRange)) {
                if (core.acceptStack(unit.stack.item, unit.stack.amount, unit) > 0) {
                    Call.transferItemTo(unit, unit.stack.item, unit.stack.amount, unit.x, unit.y, core);
                }
                unit.clearItem();
                mining = true;
                return;
            }
            this.moveToSpeed(core, dropRange / 2, 30, stats.speed);
        }
    });
}

droneType.aiController = prov(() => makeDroneAI(null));
droneType.controller = lib.func(u => makeDroneAI(null));

const blockType = extend(Block, cfg.name, {
    load() {
        this.super$load();
        this.region = lib.loadRegion(cfg.name);
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

blockType.buildVisibility = cfg.mergeOnly ? BuildVisibility.hidden : BuildVisibility.shown;
blockType.rebuildable = !cfg.mergeOnly;
blockType.alwaysUnlocked = true;
blockType.category = Category.production;
blockType.size = cfg.size;
blockType.health = cfg.health;
blockType.update = true;
blockType.solid = true;
blockType.configurable = true;
blockType.requirements = cfg.requirements;
lib.enableAllEnvironments(blockType);

blockType.config(Item, lib.cons2((build, item) => build.setSelectedItem(item)));
blockType.configClear(build => build.setSelectedItem(null));
blockType.config(java.lang.Boolean, lib.cons2((build, on) => build.setAuto(!!on)));
blockType.config(java.lang.Integer, lib.cons2((build, path) => build.tryUpgrade(path | 0)));

// Four same-team parts in an aligned 2x2 square become one merged block; the merged origin is
// the part square's bottom-left center shifted by floor((2s-1)/2) - floor((s-1)/2) for part size s.
function tryMerge(build) {
    if (cfg.mergeInto == null || Vars.net.client()) return false;
    let mega = Vars.content.block(lib.modName + "-" + cfg.mergeInto);
    if (mega == null) return false;
    let s = blockType.size;
    let d = Math.floor((2 * s - 1) / 2) - Math.floor((s - 1) / 2);
    let bx = build.tileX(), by = build.tileY();
    for (let dx = 0; dx <= 1; dx++) {
        for (let dy = 0; dy <= 1; dy++) {
            let x0 = bx - dx * s, y0 = by - dy * s;
            let parts = [];
            for (let i = 0; i < 2 && parts != null; i++) {
                for (let j = 0; j < 2; j++) {
                    let px = x0 + i * s, py = y0 + j * s;
                    let t = Vars.world.tile(px, py);
                    let b = t == null ? null : t.build;
                    if (b == null || b.block != blockType || b.team != build.team || b.tileX() != px || b.tileY() != py) { parts = null; break; }
                    parts.push(b);
                }
            }
            if (parts == null) continue;
            let origin = Vars.world.tile(x0 + d, y0 + d);
            if (origin == null) continue;
            let team = build.team;
            for (let k = 0; k < parts.length; k++) Call.removeTile(parts[k].tile);
            Call.setTile(origin, mega, team, 0);
            Fx.placeBlock.at(origin.worldx() + mega.offset, origin.worldy() + mega.offset, mega.size);
            return true;
        }
    }
    return false;
}

blockType.buildType = prov(() => {
    let item = null;
    let mergeTimer = 0;
    let subs = [];
    let auto = false;
    let autoTimer = 0;
    let levels = PATHS.map(() => 0);
    let progress = 0;
    let units = [];
    let pendingIds = null;
    let pendingSubs = null;

    function pruneUnits() {
        units = units.filter(u => !u.dead && u.isAdded());
    }
    function pruneSubs() {
        subs = subs.filter(s => !s.unit.dead && s.unit.isAdded());
    }

    return extend(Building, {
        setSelectedItem(v) { item = v; auto = false; },
        selectedItem() { return item; },
        setAuto(v) { auto = v; if (auto) this.pickLowest(); },
        isAuto() { return auto; },
        pickLowest() {
            let core = this.team.core();
            if (core == null) return;
            let ores = oreItems(this.mineTier()).filter(o => Vars.indexer.hasOre(o));
            let best = null;
            for (let i = 0; i < ores.length; i++) {
                let o = ores[i];
                if (best == null || core.items.get(o) < core.items.get(best) || (o == item && core.items.get(o) == core.items.get(best))) best = o;
            }
            item = best;
        },
        levelOf(path) { return levels[path]; },
        mineTier() { return PATHS[PATH_TIER].values[levels[PATH_TIER]]; },
        unitCap() { return PATHS[PATH_CAP].values[levels[PATH_CAP]]; },
        unitCount() { return units.length; },
        adoptSub(sub, parent) {
            sub.controller(makeDroneAI(this, cfg.subDrone.stats, parent));
            subs.push({ unit: sub, parent: parent });
        },
        subCount() { pruneSubs(); return subs.length; },
        subCountOf(parent) { pruneSubs(); return subs.filter(s => s.parent == parent).length; },
        spawnFrac() { return units.length >= this.unitCap() ? 0 : Mathf.clamp(progress / SPAWN_TIME); },
        droneStats() {
            return {
                speed: PATHS[PATH_SPEED].values[levels[PATH_SPEED]],
                mineSpeed: PATHS[PATH_MINE].values[levels[PATH_MINE]],
                capacity: PATHS[PATH_CAPACITY].values[levels[PATH_CAPACITY]],
                range: PATHS[PATH_RANGE].values[levels[PATH_RANGE]],
                dropRange: PATHS[PATH_DROP].values[levels[PATH_DROP]],
                tier: this.mineTier(),
                beams: PATHS[PATH_BEAM].values[levels[PATH_BEAM]]
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
            if (pendingSubs == null) return;
            // Loaded subs get a fresh default AI with no outpost and would die as orphans.
            for (let i = 0; i < pendingSubs.length; i += 2) {
                let sub = Groups.unit.getByID(pendingSubs[i]);
                let parent = Groups.unit.getByID(pendingSubs[i + 1]);
                if (sub == null || sub.dead || sub.team != this.team || parent == null || units.indexOf(parent) < 0) continue;
                this.adoptSub(sub, parent);
            }
            pendingSubs = null;
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

        placed() {
            this.super$placed();
            tryMerge(this);
        },

        updateTile() {
            if (pendingIds != null) this.resolvePending();
            if (cfg.mergeInto != null) {
                mergeTimer += Time.delta;
                if (mergeTimer >= MERGE_CHECK) { mergeTimer = 0; if (tryMerge(this)) return; }
            }
            if (auto) {
                autoTimer += Time.delta;
                if (autoTimer >= ORE_REFIND) { autoTimer = 0; this.pickLowest(); }
            }
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
                for (let i = 0; i < subs.length; i++) if (!subs[i].unit.dead) subs[i].unit.kill();
            }
            units = [];
            subs = [];
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
            const state = () => levels.join(",") + "|" + (item == null ? -1 : item.id) + "|" + auto;
            table.background(Styles.black6);
            table.margin(8);
            const root = table.table().get();

            function costTable(c, path) {
                c.clearChildren();
                let cost = self.upgradeCost(path);
                if (cost == null) { c.add(bundle("maxed")).color(Pal.accent); return; }
                for (let i = 0; i < cost.length; i++) {
                    let stack = cost[i];
                    c.image(stack.item.uiIcon).size(18).padRight(2);
                    c.add(stack.amount + "").padRight(8).update(cons(l => {
                        let core = self.team.core();
                        l.setColor(core != null && core.items.has(stack.item, stack.amount) ? Color.white : Pal.remove);
                    }));
                }
            }

            function valueText(path) {
                let value = PATHS[path].values[levels[path]];
                if (path == PATH_TIER) return bundle("value.tier", value);
                return bundle("value." + PATHS[path].key, Strings.autoFixed(value, 2));
            }

            function rebuild() {
                snapshot = state();
                root.clearChildren();
                root.table(cons(t => {
                    t.table(cons(head => {
                        head.add(bundle("ore")).left().padRight(8);
                        head.button(bundle("lowest"), Styles.togglet, run(() => build.configure(auto ? null : java.lang.Boolean.TRUE)))
                            .height(32).minWidth(90).checked(boolf(b => auto)).tooltip(bundle("lowest.tooltip"));
                    })).left().colspan(2).row();
                    let ores = oreItems(MAX_TIER);
                    let rows = [
                        { planet: Planets.erekir,  ores: ores.filter(o => !Items.serpuloItems.contains(o)) },
                        { planet: Planets.serpulo, ores: ores.filter(o => Items.serpuloItems.contains(o)) },
                    ];
                    for (let r = 0; r < rows.length; r++) {
                        if (rows[r].ores.length == 0) continue;
                        t.add(rows[r].planet.localizedName).left().minWidth(70).padRight(6);
                        t.table(cons(line => {
                            for (let i = 0; i < rows[r].ores.length; i++) {
                                let ore = rows[r].ores[i];
                                let locked = ore.hardness > self.mineTier();
                                let cell = line.button(new TextureRegionDrawable(ore.uiIcon), Styles.clearTogglei, 24, run(() => {
                                    if (locked) return;
                                    build.configure(item == ore ? null : ore);
                                }));
                                cell.size(40).checked(boolf(b => item == ore));
                                cell.tooltip(locked ? bundle("locked", ore.localizedName, ore.hardness) : ore.localizedName);
                                if (locked) cell.get().getImage().setColor(Color.darkGray);
                            }
                        })).left().row();
                    }
                })).left().row();
                root.table(cons(t => {
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
            root.update(run(() => { if (state() != snapshot) { rebuild(); table.pack(); } }));
        },

        config() { return auto ? java.lang.Boolean.TRUE : item; },

        version() { return 3; },

        write(write) {
            this.super$write(write);
            write.s(item == null ? -1 : item.id);
            write.bool(auto);
            write.f(progress);
            write.b(PATHS.length);
            for (let i = 0; i < PATHS.length; i++) write.b(levels[i]);
            pruneUnits();
            write.s(units.length);
            for (let i = 0; i < units.length; i++) write.i(units[i].id);
            pruneSubs();
            write.s(subs.length);
            for (let i = 0; i < subs.length; i++) { write.i(subs[i].unit.id); write.i(subs[i].parent.id); }
        },

        read(read, revision) {
            this.super$read(read, revision);
            let id = read.s();
            item = id < 0 ? null : Vars.content.items().get(id);
            auto = revision >= 2 ? read.bool() : false;
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
            subs = [];
            pendingSubs = null;
            if (revision >= 3) {
                let subCount = read.s();
                pendingSubs = [];
                for (let i = 0; i < subCount * 2; i++) pendingSubs.push(read.i());
            }
        }
    });
});

return blockType;
}

exports.create = create;
exports.linear = linear;

create({
    name: "outpost",
    unitName: "outpost-drone",
    size: 3,
    health: 480,
    requirements: ItemStack.with(Items.copper, 60, Items.lead, 70, Items.graphite, 40, Items.silicon, 20),
    unitHealth: 400,
    hitSize: 9,
    engineOffset: 6.5,
    mergeInto: "outpost-quad",
    paths: [
        [5, 7, 9, 12, 15],
        [1.5, 1.65, 1.8, 1.95, 2.15],
        [0.5, 1.0, 1.75, 2.75, 4.0],
        [5, 8, 10, 14, 18],
        [1, 2, 3, 4],
        linear(9, 2, 41),
        linear(9, 2, 41),
        [2, 3, 4, 5, 6, 7, 8],
    ],
    statCosts: [
        ItemStack.with(Items.titanium, 150, Items.silicon, 80),
        ItemStack.with(Items.thorium, 150, Items.silicon, 120),
        ItemStack.with(Items.plastanium, 120, Items.thorium, 100),
        ItemStack.with(Items.phaseFabric, 80, Items.surgeAlloy, 60),
    ],
    tierCosts: [
        ItemStack.with(Items.copper, 100, Items.lead, 100),
        ItemStack.with(Items.graphite, 200, Items.silicon, 150),
        ItemStack.with(Items.plastanium, 150, Items.surgeAlloy, 60),
    ],
    erekirStatCosts: [
        ItemStack.with(Items.beryllium, 150, Items.silicon, 80),
        ItemStack.with(Items.tungsten, 150, Items.silicon, 120),
        ItemStack.with(Items.oxide, 120, Items.tungsten, 100),
        ItemStack.with(Items.phaseFabric, 80, Items.surgeAlloy, 60),
    ],
    erekirTierCosts: [
        ItemStack.with(Items.sand, 200),
        ItemStack.with(Items.graphite, 200, Items.silicon, 150),
        ItemStack.with(Items.beryllium, 150, Items.oxide, 60),
    ],
    beamCosts: [
        ItemStack.with(Items.graphite, 100, Items.silicon, 60),
        ItemStack.with(Items.titanium, 150, Items.silicon, 100),
        ItemStack.with(Items.thorium, 150, Items.silicon, 150),
        ItemStack.with(Items.plastanium, 120, Items.thorium, 120),
        ItemStack.with(Items.phaseFabric, 100, Items.surgeAlloy, 80),
        ItemStack.with(Items.phaseFabric, 200, Items.surgeAlloy, 160),
    ],
    erekirBeamCosts: [
        ItemStack.with(Items.beryllium, 100, Items.silicon, 60),
        ItemStack.with(Items.beryllium, 200, Items.silicon, 100),
        ItemStack.with(Items.tungsten, 150, Items.silicon, 150),
        ItemStack.with(Items.oxide, 120, Items.tungsten, 120),
        ItemStack.with(Items.phaseFabric, 100, Items.surgeAlloy, 80),
        ItemStack.with(Items.phaseFabric, 200, Items.surgeAlloy, 160),
    ],
});
