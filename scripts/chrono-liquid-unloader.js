
const lib = require("lib");
const warmupSpeed = 0.05, TRANSFER_RATE = 5000;
let topRegion, bottomRegion, rotatorRegion;
const TEAL = Color.valueOf("#00c8c8");
const outEffect = lib.newEffect(38, e => {
    Draw.color(TEAL);
    Angles.randLenVectors(e.id, 1, 8 * e.fout(), 0, 360, new Floatc2({ get: (x, y) => {
        let a = Angles.angle(0, 0, x, y);
        Fill.circle(e.x + Angles.trnsx(a,2) + x + Angles.trnsx(a,4)*e.fout(),
                    e.y + Angles.trnsy(a,2) + y + Angles.trnsy(a,4)*e.fout(), e.fslope()*0.8);
    }}));
});
const blockType = extend(Block, "chrono-liquid-unloader", {
    load() {
        this.super$load();
        this.region  = lib.loadRegion("chrono-liquid-unloader");
        topRegion    = lib.loadRegion("chrono-liquid-unloader-top");
        bottomRegion = lib.loadRegion("chrono-liquid-unloader-bottom");
        rotatorRegion = lib.loadRegion("chrono-liquid-unloader-rotator");
    },
    setBars() {
        this.super$setBars();
        this.barMap.put("liquid", lib.func(e => new Bar(
            prov(() => e.liquidType == null ? Core.bundle.get("bar.liquid") : e.liquidType.localizedName),
            prov(() => e.liquidType == null ? Pal.gray : e.liquidType.barColor),
            floatp(() => e.liquidType == null ? 0 : e.liquids.get(e.liquidType) / e.block.liquidCapacity)
        )));
    },
    pointConfig(config, transformer) {
        if (lib.isStringConfig(config)) return lib.pointTransportConfig(config, transformer);
        if (!IntSeq.__javaObject__.isInstance(config)) return config;
        if (config.size < 2) return config;
        let lc = Math.max(0, Math.min(config.get(1), Math.floor((config.size - 2) / 2)));
        let ns = new IntSeq(config.size);
        ns.add(config.get(0)); ns.add(lc);
        for (let i = 0; i < lc; i++) {
            let base = 2 + i * 2;
            let p = new Point2(config.get(base)*2-1, config.get(base+1)*2-1);
            transformer.get(p);
            ns.add((p.x+1)/2);
            ns.add((p.y+1)/2);
        }
        for (let i = 2 + lc * 2; i < config.size; i++) ns.add(config.get(i));
        return ns;
    },
});
blockType.buildVisibility  = BuildVisibility.shown;
blockType.alwaysUnlocked   = true;
blockType.category         = Category.liquid;
blockType.size             = 1;
blockType.health           = 2147483647;
blockType.buildCost        = 0.001;
blockType.update           = true;
blockType.solid            = true;
blockType.hasLiquids       = true;
blockType.outputsLiquid    = true;
blockType.configurable     = true;
blockType.saveConfig       = false;
blockType.liquidCapacity   = 100;
blockType.noUpdateDisabled = true;
blockType.requirements     = ItemStack.with();
lib.enableAllEnvironments(blockType);

blockType.config(IntSeq, lib.cons2((tile, seq) => {
    if (seq.size == 0) { tile.setLinks(new Seq(java.lang.Integer)); return; }
    if (seq.size == 1) { tile.setLiquidTypeId(seq.get(0)); tile.setLinks(new Seq(java.lang.Integer)); return; }
    let lc = Math.max(0, Math.min(seq.get(1), Math.floor((seq.size - 2) / 2))), lx = null, nl = new Seq(true, lc, java.lang.Integer);
    for (let i = 2; i < 2 + lc*2; i++) { let n = seq.get(i); if (lx == null) lx = n; else { nl.add(lib.int(Point2.pack(lx + tile.tileX(), n + tile.tileY()))); lx = null; } }
    tile.setLiquidTypeId(seq.get(0)); tile.setLinks(nl);
    if (seq.size >= 2 + lc*2 + 6) tile.setAutoFlagsFromSeq(seq, 2 + lc*2);
}));
blockType.config(java.lang.String, lib.cons2((tile, text) => {
    let cfg = lib.readTransportConfig(text, tile.tileX(), tile.tileY());
    if (cfg == null) return;
    tile.setLiquidTypeId(cfg.selectedId);
    tile.setLinks(cfg.links);
    tile.setAutoFlagsFromArray(cfg.autoFlags);
}));
blockType.config(java.lang.Integer, lib.cons2((tile, int) => { tile.setOneLink(int); }));
blockType.config(Liquid, lib.cons2((tile, liquid) => { tile.setLiquidTypeId(liquid == null ? -1 : liquid.id); }));
blockType.configClear(tile => { tile.setLiquidTypeId(-1); });

const theGroup = new EntityGroup(Building, false, false);
blockType.buildType = prov(() => {
    const MAX_LOOP = 100, FRAME_DELAY = 5;
    const timer = new Interval(3);
    let liquidType = null, links = new Seq(java.lang.Integer), deadLinks = new Seq(java.lang.Integer);
    let autoFlags = [false, false, false, false, false, false];
    let slowdownDelay = 0, warmup = 0, rotateDeg = 0, rotateSpeed = 0;
    const looper = (() => { let idx = 0; return { next(m) { if (idx < 0 || idx >= m) idx = m-1; let v = idx; idx--; return v; } }; })();
    function lvt(the, t) { return t && t.team == the.team && t.liquids != null; }
    function lv(the, pos) { if (pos == null || pos == -1) return false; return lvt(the, Vars.world.build(pos)); }
    const clearFn = () => { let s = new IntSeq(2); s.add(liquidType == null ? -1 : liquidType.id); s.add(0); return s; };
    const scanJob = lib.makeScanJob(autoFlags, 50);
    const batchApply = lib.makeBatchApply(() => links);
    return extend(Building, {
        get liquidType() { return liquidType; },
        set liquidType(v) { liquidType = v; },
        getLinks() { return links; },
        setLinks(v) {
            links = v;
            for (let i = links.size-1; i >= 0; i--) {
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
        deadLink(v) {
            if (Vars.net.client()) return;
            let int = new java.lang.Integer(v);
            if (links.contains(boolf(i => i == int))) this.configure(int);
            deadLinks.add(int);
        },
        tryResumeDeadLink(v) {
            if (Vars.net.client()) return;
            let int = new java.lang.Integer(v);
            if (!deadLinks.remove(boolf(i => i == int))) return;
            if (lv(this, int)) this.configure(new java.lang.Integer(Vars.world.build(int).pos()));
        },
        setLiquidTypeId(v) {
            let liquids = Vars.content.liquids();
            liquidType = (v == null || v < 0 || v >= liquids.size) ? null : liquids.get(v);
        },
        updateTile() {
            let hasLiquid = false;
            if (timer.get(0, FRAME_DELAY)) {
                if (liquidType != null && this.efficiency > 0) {
                    let max = links.size;
                    for (let i = 0; i < Math.min(MAX_LOOP, max); i++) {
                        let idx = looper.next(max), pos = links.get(idx);
                        if (pos == null || pos == -1) { this.configure(lib.int(pos)); continue; }
                        let lt = Vars.world.build(pos);
                        if (!lvt(this, lt)) { this.deadLink(pos); if (--max <= 0) break; continue; }
                        let available = lt.liquids.get(liquidType);
                        let space = this.block.liquidCapacity - this.liquids.get(liquidType);
                        let amount = Math.min(available, Math.min(space, TRANSFER_RATE));
                        if (amount > 0.001) {
                            lt.liquids.remove(liquidType, amount);
                            this.liquids.add(liquidType, amount);
                            this.dumpLiquid(liquidType);
                            hasLiquid = true;
                        }
                    }
                }
                if (hasLiquid) {
                    slowdownDelay = 60;
                    if (rotateSpeed > 0.5 && Mathf.random(60) > 12)
                        Time.run(Mathf.random(10), run(() => { outEffect.at(this.x, this.y, 0); }));
                }
                if (liquidType != null && this.liquids.get(liquidType) > 0.001) this.dumpLiquid(liquidType);
            }
            scanJob.tick(this, () => links, lvt, clearFn, batchApply);
            warmup = Mathf.lerpDelta(warmup, this.efficiency > 0 ? 1 : 0, warmupSpeed);
            rotateSpeed = Mathf.lerpDelta(rotateSpeed, slowdownDelay > 0 ? 1 : 0, warmupSpeed);
            slowdownDelay = Math.max(0, slowdownDelay - 1);
            if (warmup > 0) rotateDeg += rotateSpeed;
        },
        draw() {
            this.super$draw();
            Draw.color(Color.valueOf("#0a156e")); Draw.alpha(warmup);
            Draw.rect(bottomRegion, this.x, this.y); Draw.color();
            Draw.alpha(warmup); Draw.rect(rotatorRegion, this.x, this.y, rotateDeg);
            Draw.alpha(1); Draw.rect(topRegion, this.x, this.y);
            Draw.color(liquidType == null ? Color.clear : liquidType.color);
            Draw.rect("unloader-center", this.x, this.y); Draw.color();
        },
        drawConfigure() {
            let sin = Mathf.absin(Time.time, 6, 1); Lines.stroke(1);
            Drawf.circles(this.x, this.y, (this.tile.block().size/2+1)*Vars.tilesize+sin-2, Pal.accent);
            for (let i = 0; i < links.size; i++) {
                let pos = links.get(i);
                if (lv(this, pos)) { let lt = Vars.world.build(pos); Drawf.square(lt.x, lt.y, lt.block.size*Vars.tilesize/2+1, Pal.place); }
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
            table.table(cons(t => {
                ItemSelection.buildTable(t, Vars.content.liquids(), prov(() => liquidType), cons(v => { this.configure(v); }));
            })).row();
        },
        config() {
            return lib.transportConfig(liquidType == null ? -1 : liquidType.id, links, this.tile.x, this.tile.y, autoFlags);
        },
        acceptLiquid(source, liquid) { return liquidType != null && liquid == liquidType; },
        outputsLiquid() { return true; },
        add() { if (this.added) return; theGroup.add(this); this.super$add(); },
        remove() { if (!this.added) return; theGroup.remove(this); this.super$remove(); },
        version() { return 3; },
        write(write) {
            this.super$write(write);
            write.s(liquidType == null ? -1 : liquidType.id); write.s(links.size);
            let it = links.iterator(); while (it.hasNext()) write.i(it.next());
            write.bool(autoFlags[0]); write.bool(autoFlags[1]); write.bool(autoFlags[2]); write.bool(autoFlags[3]); write.bool(autoFlags[4]); write.bool(autoFlags[5]);
        },
        read(read, revision) {
            this.super$read(read, revision);
            let id = read.s(); this.setLiquidTypeId(id);
            links = new Seq(java.lang.Integer);
            let sz = read.s(); for (let i = 0; i < sz; i++) links.add(new java.lang.Integer(read.i()));
            if (revision >= 2) { autoFlags[0] = read.bool(); autoFlags[1] = read.bool(); autoFlags[2] = read.bool(); autoFlags[3] = read.bool(); }
            if (revision >= 3) { autoFlags[4] = read.bool(); autoFlags[5] = read.bool(); }
        },
    });
});
Events.on(BlockBuildEndEvent, cons(e => {
    if (!e.breaking) theGroup.each(cons(cen => { cen.tryResumeDeadLink(e.tile.pos()); }));
}));

module.exports = blockType;
