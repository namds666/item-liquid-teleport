const lib = require("lib");
const warmupSpeed = 0.05, VISUAL_MAX_HEAT = 150;
const HeatBlock = Packages.mindustry.world.blocks.heat.HeatBlock;
let topRegion, bottomRegion, rotatorRegion;
const HEAT = Color.valueOf("#ff7a38");
const outEffect = lib.newEffect(38, e => {
    Draw.color(HEAT);
    Angles.randLenVectors(e.id, 1, 8 * e.fout(), 0, 360, new Floatc2({ get: (x, y) => {
        let a = Angles.angle(0, 0, x, y);
        Fill.circle(e.x + Angles.trnsx(a, 2) + x + Angles.trnsx(a, 4) * e.fout(),
                    e.y + Angles.trnsy(a, 2) + y + Angles.trnsy(a, 4) * e.fout(), e.fslope() * 0.8);
    }}));
});

function isHeatBlock(build) {
    if (build == null) return false;
    try {
        return HeatBlock.__javaObject__.isInstance(build);
    } catch (e) {
        return typeof build.heat === "function" && typeof build.heatFrac === "function";
    }
}

const blockType = extend(Block, "chrono-heat-unloader", {
    load() {
        this.super$load();
        this.region = lib.loadRegion("chrono-heat-unloader");
        topRegion = lib.loadRegion("chrono-heat-unloader-top");
        bottomRegion = lib.loadRegion("chrono-heat-unloader-bottom");
        rotatorRegion = lib.loadRegion("chrono-heat-unloader-rotator");
    },
    setBars() {
        this.super$setBars();
        this.barMap.put("heat", lib.func(e => new Bar(
            prov(() => Core.bundle.format("bar.heatamount", Math.floor(e.outputHeat + 0.001))),
            prov(() => Pal.lightOrange),
            floatp(() => Math.min(e.outputHeat / VISUAL_MAX_HEAT, 1))
        )));
    },
    pointConfig(config, transformer) {
        if (lib.isStringConfig(config)) return lib.pointTransportConfig(config, transformer);
        if (!IntSeq.__javaObject__.isInstance(config)) return config;
        if (config.size < 2) return config;
        let lc = Math.max(0, Math.min(config.get(1), Math.floor((config.size - 2) / 2)));
        let ns = new IntSeq(config.size);
        ns.add(-1); ns.add(lc);
        for (let i = 0; i < lc; i++) {
            let base = 2 + i * 2;
            let p = new Point2(config.get(base) * 2 - 1, config.get(base + 1) * 2 - 1);
            transformer.get(p);
            ns.add((p.x + 1) / 2);
            ns.add((p.y + 1) / 2);
        }
        for (let i = 2 + lc * 2; i < config.size; i++) ns.add(config.get(i));
        return ns;
    },
});
blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked = true;
blockType.category = Category.crafting;
blockType.size = 1;
blockType.health = 2147483647;
blockType.buildCost = 0.001;
blockType.update = true;
blockType.solid = true;
blockType.rotate = true;
blockType.rotateDraw = false;
blockType.drawArrow = true;
blockType.configurable = true;
blockType.saveConfig = false;
blockType.noUpdateDisabled = true;
blockType.requirements = ItemStack.with();
lib.enableErekirOnly(blockType);

blockType.config(IntSeq, lib.cons2((tile, seq) => {
    if (seq.size == 0) { tile.setLinks(new Seq(java.lang.Integer)); return; }
    let lc = seq.size >= 2 ? Math.max(0, Math.min(seq.get(1), Math.floor((seq.size - 2) / 2))) : 0, lx = null;
    let links = new Seq(java.lang.Integer);
    for (let i = 2; i < Math.min(2 + lc * 2, seq.size); i++) {
        let n = seq.get(i);
        if (lx == null) lx = n;
        else { links.add(lib.int(Point2.pack(lx + tile.tileX(), n + tile.tileY()))); lx = null; }
    }
    tile.setLinks(links);
    let autoStart = 2 + lc * 2;
    if (seq.size >= autoStart + 6) tile.setAutoFlagsFromSeq(seq, autoStart);
}));
blockType.config(java.lang.String, lib.cons2((tile, text) => {
    let cfg = lib.readTransportConfig(text, tile.tileX(), tile.tileY());
    if (cfg == null) return;
    tile.setLinks(cfg.links);
    tile.setAutoFlagsFromArray(cfg.autoFlags);
}));
blockType.config(java.lang.Integer, lib.cons2((tile, int) => { tile.setOneLink(int); }));
blockType.configClear(tile => { tile.setLinks(new Seq(java.lang.Integer)); });

const theGroup = new EntityGroup(Building, false, false);
blockType.buildType = prov(() => {
    const MAX_LOOP = 100, FRAME_DELAY = 5;
    const timer = new Interval(3);
    let links = new Seq(java.lang.Integer), deadLinks = new Seq(java.lang.Integer);
    let autoFlags = [false, false, false, false, false, false];
    let warmup = 0, rotateDeg = 0, rotateSpeed = 0;
    let outputHeat = 0, pulledHeat = 0, pushedHeat = 0, pushedTick = -1;
    const looper = (() => { let idx = 0; return { next(m) { if (idx < 0 || idx >= m) idx = m - 1; let v = idx; idx--; return v; } }; })();
    function lvt(the, t) { return t && t.team == the.team && isHeatBlock(t); }
    function lv(the, pos) { if (pos == null || pos == -1) return false; return lvt(the, Vars.world.build(pos)); }
    const clearFn = () => lib.transportConfig(-1, new Seq(java.lang.Integer), 0, 0, autoFlags);
    const scanJob = lib.makeScanJob(autoFlags, 50);
    const batchApply = lib.makeBatchApply(() => links);
    return new JavaAdapter(Building, HeatBlock, {
        get outputHeat() { return outputHeat; },
        getLinks() { return links; },
        setLinks(v) {
            links = v == null ? new Seq(java.lang.Integer) : v;
            for (let i = links.size - 1; i >= 0; i--) {
                let t = Vars.world.build(links.get(i));
                if (!lvt(this, t)) links.remove(i); else links.set(i, lib.int(t.pos()));
            }
        },
        setOneLink(v) {
            let int = new java.lang.Integer(v);
            if (!links.remove(boolf(i => i == int))) links.add(int);
        },
        setAutoFlagsFromSeq(seq, offset) { for (let i = 0; i < 6; i++) autoFlags[i] = (offset + i < seq.size) && seq.get(offset + i) > 0; },
        setAutoFlagsFromArray(values) { for (let i = 0; i < 6; i++) autoFlags[i] = !!values[i]; },
        acceptChronoHeat(amount) {
            let tick = Vars.state.updateId;
            if (pushedTick != tick) {
                pushedHeat = 0;
                pushedTick = tick;
            }
            pushedHeat += amount;
            outputHeat = pulledHeat + pushedHeat;
        },
        deadLink(v) {
            if (Vars.net.client()) return;
            let int = new java.lang.Integer(v);
            if (links.contains(boolf(i => i == int))) this.configure(int);
            deadLinks.add(int);
            if (deadLinks.size >= 50) deadLinks.removeRange(0, 25);
        },
        tryResumeDeadLink(v) {
            if (Vars.net.client()) return;
            let int = new java.lang.Integer(v);
            if (!deadLinks.remove(boolf(i => i == int))) return;
            let t = Vars.world.build(int);
            if (lv(this, int)) this.configure(new java.lang.Integer(t.pos()));
        },
        updateTile() {
            if (pushedTick < Vars.state.updateId - 1) pushedHeat = 0;
            let heatSent = false;
            if (timer.get(0, FRAME_DELAY)) {
                pulledHeat = 0;
                if (this.efficiency > 0) {
                    let max = links.size;
                    for (let i = 0; i < Math.min(MAX_LOOP, max); i++) {
                        let idx = looper.next(max), pos = links.get(idx);
                        if (pos == null || pos == -1) { this.configure(lib.int(pos)); continue; }
                        let lt = Vars.world.build(pos);
                        if (!lvt(this, lt)) { this.deadLink(pos); if (--max <= 0) break; continue; }
                        let amount = lt.heat();
                        if (amount > 0.001) {
                            pulledHeat += amount;
                            heatSent = true;
                        }
                    }
                }
            }
            outputHeat = pulledHeat + pushedHeat;
            if (this.efficiency > 0) {
                warmup = Mathf.lerpDelta(warmup, outputHeat > 0.001 ? 1 : 0, warmupSpeed);
                rotateSpeed = Mathf.lerpDelta(rotateSpeed, outputHeat > 0.001 ? 1 : 0, warmupSpeed);
            } else {
                warmup = Mathf.lerpDelta(warmup, 0, warmupSpeed);
                rotateSpeed = Mathf.lerpDelta(rotateSpeed, 0, warmupSpeed);
            }
            if (warmup > 0) rotateDeg += rotateSpeed;
            scanJob.tick(this, () => links, lvt, clearFn, batchApply);
            if (heatSent && rotateSpeed > 0.5 && Mathf.random(60) > 48)
                Time.run(Mathf.random(10), run(() => { outEffect.at(this.x, this.y, 0); }));
        },
        heat() { return outputHeat; },
        heatFrac() { return outputHeat / VISUAL_MAX_HEAT; },
        draw() {
            this.super$draw();
            Draw.color(HEAT); Draw.alpha(warmup);
            Draw.rect(bottomRegion, this.x, this.y); Draw.color();
            Draw.alpha(warmup); Draw.rect(rotatorRegion, this.x, this.y, rotateDeg);
            Draw.alpha(1); Draw.rect(topRegion, this.x, this.y);
            Draw.color(HEAT); Draw.rect("unloader-center", this.x, this.y); Draw.color();
        },
        drawConfigure() {
            let sin = Mathf.absin(Time.time, 6, 1); Lines.stroke(1);
            Drawf.circles(this.x, this.y, (this.tile.block().size / 2 + 1) * Vars.tilesize + sin - 2, Pal.accent);
            for (let i = 0; i < links.size; i++) {
                let pos = links.get(i);
                if (lv(this, pos)) { let lt = Vars.world.build(pos); Drawf.square(lt.x, lt.y, lt.block.size * Vars.tilesize / 2 + 1, Pal.place); }
            }
        },
        onConfigureBuildTapped(other) {
            if (this == other) { this.configure(-1); return false; }
            if (other.team == this.team) { this.configure(new java.lang.Integer(other.pos())); return false; }
            return true;
        },
        buildConfiguration(table) {
            table.table(cons(t => {
                lib.addAutoConnectButtons(t, this, () => links, lvt, clearFn, autoFlags);
            })).row();
        },
        config() {
            return lib.transportConfig(-1, links, this.tile.x, this.tile.y, autoFlags);
        },
        add() { if (this.added) return; theGroup.add(this); this.super$add(); },
        remove() { if (!this.added) return; theGroup.remove(this); this.super$remove(); },
        version() { return 1; },
        write(write) {
            this.super$write(write);
            write.s(links.size);
            let it = links.iterator(); while (it.hasNext()) write.i(it.next());
            write.bool(autoFlags[0]); write.bool(autoFlags[1]); write.bool(autoFlags[2]); write.bool(autoFlags[3]); write.bool(autoFlags[4]); write.bool(autoFlags[5]);
        },
        read(read, revision) {
            this.super$read(read, revision);
            links = new Seq(java.lang.Integer);
            let sz = read.s(); for (let i = 0; i < sz; i++) links.add(new java.lang.Integer(read.i()));
            if (revision >= 1) { autoFlags[0] = read.bool(); autoFlags[1] = read.bool(); autoFlags[2] = read.bool(); autoFlags[3] = read.bool(); autoFlags[4] = read.bool(); autoFlags[5] = read.bool(); }
        },
    });
});
Events.on(BlockBuildEndEvent, cons(e => {
    if (!e.breaking) theGroup.each(cons(cen => { cen.tryResumeDeadLink(e.tile.pos()); }));
}));

module.exports = blockType;
