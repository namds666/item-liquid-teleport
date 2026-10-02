const lib = require("lib");
const rules = require("hypno-rules");
const yuriModule = require("hypno-yuri");

const TILE = rules.TILE;
const MERGE_CHECK = 120;

function create(cfg) {
    const yuriType = cfg.unitType;

    const blockType = extend(Block, cfg.name, {
        load() {
            this.super$load();
            this.region = lib.loadRegion(cfg.name);
        },

        setStats() {
            this.super$setStats();
            this.stats.add(Stat.range, rules.rangeTiles(0), StatUnit.blocks);
            this.stats.add(Stat.output, yuriType.emoji() + " " + yuriType.localizedName);
            this.stats.add(Stat.productionTime, rules.RESPAWN_TIME / 60, StatUnit.seconds);
        },

        setBars() {
            this.super$setBars();
            this.addBar("progress", lib.func(e => new Bar(
                prov(() => Core.bundle.get("bar.progress")),
                prov(() => Pal.ammo),
                floatp(() => e.respawnFrac())
            )));
        },

        drawPlace(x, y, rotation, valid) {
            this.super$drawPlace(x, y, rotation, valid);
            Drawf.dashCircle(x * TILE + this.offset, y * TILE + this.offset, rules.rangeTiles(0) * TILE, Pal.sapBullet);
        }
    });

    blockType.category = Category.units;
    blockType.size = cfg.size;
    blockType.health = cfg.health;
    blockType.update = true;
    blockType.solid = true;
    blockType.configurable = true;
    blockType.hasItems = true;
    blockType.itemCapacity = rules.ITEM_CAPACITY;
    blockType.requirements = cfg.requirements;
    blockType.alwaysUnlocked = true;
    blockType.buildVisibility = cfg.mergeOnly ? BuildVisibility.hidden : BuildVisibility.shown;
    blockType.rebuildable = !cfg.mergeOnly;
    lib.enableAllEnvironments(blockType);

    blockType.config(java.lang.Integer, lib.cons2((build, path) => build.tryUpgrade()));

    blockType.buildType = prov(() => {
        let level = 0;
        let progress = 0;
        let unit = null;
        let pendingId = -1;
        let mergeTimer = 0;

        function alive(u) {
            return u != null && !u.dead && u.isAdded();
        }

        function tryMerge(build) {
            return cfg.mergeInto != null && lib.tryMergeSquare(build, blockType, Vars.content.block(lib.modName + "-" + cfg.mergeInto));
        }

        return extend(Building, {
            level() { return level; },
            hypnoRange() { return rules.rangeTiles(level) * TILE; },
            hypnoChannel() { return rules.channelTicks(level); },
            yuri() { return alive(unit) ? unit : null; },
            respawnFrac() { return alive(unit) ? 0 : Mathf.clamp(progress / rules.RESPAWN_TIME); },
            upgradeCost() { return rules.upgradeCost(level); },
            canUpgrade() {
                let cost = this.upgradeCost();
                let core = this.team.core();
                return cost != null && core != null && core.items.has(cost);
            },
            tryUpgrade() {
                if (!this.canUpgrade()) return;
                this.team.core().items.remove(this.upgradeCost());
                level++;
            },

            acceptItem(source, item) {
                return item == rules.RESPAWN_ITEM && this.items.get(item) < rules.ITEM_CAPACITY;
            },

            // Ground units on a solid tile are killed at once, so Yuri appears on a free tile next to the block.
            spawnTile() {
                let r = Math.floor(blockType.size / 2) + 1, cx = this.tileX(), cy = this.tileY();
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (Math.abs(dx) != r && Math.abs(dy) != r) continue;
                        let t = Vars.world.tile(cx + dx, cy + dy);
                        if (t != null && !t.solid() && !t.floor().isDeep()) return t;
                    }
                }
                return null;
            },

            spawnYuri(t) {
                let u = yuriType.create(this.team);
                u.set(t.worldx(), t.worldy());
                u.rotation = 90;
                u.add();
                yuriModule.adopt(u, this);
                unit = u;
                Fx.spawn.at(this.x, this.y);
                Events.fire(new EventType.UnitCreateEvent(u, this, null));
            },

            resolvePending() {
                let u = Groups.unit.getByID(pendingId);
                pendingId = -1;
                if (u != null && u.type == yuriType && u.team == this.team && !u.dead) {
                    unit = u;
                    yuriModule.adopt(u, this);
                }
            },

            placed() {
                this.super$placed();
                tryMerge(this);
            },

            updateTile() {
                if (cfg.mergeInto != null) {
                    mergeTimer += Time.delta;
                    if (mergeTimer >= MERGE_CHECK) { mergeTimer = 0; if (tryMerge(this)) return; }
                }
                if (pendingId >= 0) this.resolvePending();
                if (unit != null && (!alive(unit) || unit.team != this.team)) unit = null;
                if (unit != null) { progress = 0; return; }
                progress = Math.min(progress + this.edelta(), rules.RESPAWN_TIME);
                if (progress < rules.RESPAWN_TIME || Vars.net.client() || !this.items.has(rules.RESPAWN_ITEM, cfg.respawnCost)) return;
                let t = this.spawnTile();
                if (t != null) {
                    this.items.remove(rules.RESPAWN_ITEM, cfg.respawnCost);
                    this.spawnYuri(t);
                    progress = 0;
                }
            },

            onRemoved() {
                this.super$onRemoved();
                if (!Vars.net.client() && alive(unit)) unit.kill();
                unit = null;
            },

            drawSelect() {
                this.super$drawSelect();
                Drawf.dashCircle(this.x, this.y, this.hypnoRange(), Pal.sapBullet);
                if (!alive(unit)) return;
                let tethers = yuriModule.tethersOf(unit);
                if (tethers.length == 0) return;
                Draw.z(Layer.effect);
                Draw.color(Pal.sapBullet);
                Lines.stroke(1);
                for (let i = 0; i < tethers.length; i++) Lines.line(this.x, this.y, tethers[i].target.x, tethers[i].target.y);
                Draw.reset();
            },

            buildConfiguration(table) {
                const self = this;
                let snapshot = -1;
                table.background(Styles.black6);
                table.margin(8);
                const root = table.table().get();

                function costTable(c) {
                    c.clearChildren();
                    let cost = self.upgradeCost();
                    if (cost == null) { c.add(Core.bundle.get("outpost.maxed")).color(Pal.accent); return; }
                    for (let i = 0; i < cost.length; i++) {
                        let stack = cost[i];
                        c.image(stack.item.uiIcon).size(18).padRight(2);
                        c.add(stack.amount + "").padRight(8).update(cons(l => {
                            let core = self.team.core();
                            l.setColor(core != null && core.items.has(stack.item, stack.amount) ? Color.white : Pal.remove);
                        }));
                    }
                }

                function valueText() {
                    let seconds = Strings.autoFixed(self.hypnoChannel() / 60, 2);
                    return Core.bundle.format("hypno.value", rules.rangeTiles(level), seconds);
                }

                function rebuild() {
                    snapshot = level;
                    root.clearChildren();
                    root.table(Styles.black3, cons(row => {
                        row.margin(4).left();
                        row.add(Core.bundle.get("hypno.path")).left().minWidth(120).padRight(6);
                        row.label(prov(() => (level + 1) + "/" + (rules.MAX_LEVEL + 1) + "  " + valueText())).left().minWidth(130).padRight(8);
                        row.table(cons(c => costTable(c))).left().minWidth(120).padRight(6);
                        let btn = row.button(Core.bundle.get("outpost.upgrade"), run(() => self.configure(lib.int(0))))
                            .minWidth(120).height(40).disabled(boolf(b => !self.canUpgrade()));
                        btn.get().getLabel().setWrap(false);
                    })).growX().row();
                }

                rebuild();
                root.update(run(() => { if (snapshot != level) { rebuild(); table.pack(); } }));
            },

            config() { return lib.int(0); },

            version() { return 1; },

            write(write) {
                this.super$write(write);
                write.b(level);
                write.f(progress);
                write.i(alive(unit) ? unit.id : -1);
            },

            read(read, revision) {
                this.super$read(read, revision);
                level = Mathf.clamp(read.b(), 0, rules.MAX_LEVEL);
                progress = read.f();
                pendingId = read.i();
                unit = null;
            }
        });
    });

    return blockType;
}

exports.blockType = create({
    name: "chrono-hypno",
    size: rules.BLOCK_SIZE,
    health: rules.BLOCK_HEALTH,
    requirements: rules.REQUIREMENTS,
    respawnCost: rules.RESPAWN_COST,
    unitType: yuriModule.yuriType,
    mergeInto: "chrono-hypno-big"
});
exports.bigBlockType = create({
    name: "chrono-hypno-big",
    size: rules.BIG_BLOCK_SIZE,
    health: rules.BIG_BLOCK_HEALTH,
    requirements: rules.BIG_REQUIREMENTS,
    respawnCost: rules.BIG_RESPAWN_COST,
    unitType: yuriModule.yuriBigType,
    mergeOnly: true
});
