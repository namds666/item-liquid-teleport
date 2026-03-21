
const lib = require("lib");
const range = 1200, warmupSpeed = 0.05, LINK_LIMIT = 32, TRANSFER_RATE = 20;
let topRegion, bottomRegion, rotatorRegion;
const GREEN = Color.valueOf("#00e070");
const inEffect = lib.newEffect(38, e => {
    Draw.color(GREEN);
    Angles.randLenVectors(e.id, 1, 8 * e.fout(), 0, 360, new Floatc2({ get: (x, y) => {
        let a = Angles.angle(0, 0, x, y);
        Fill.circle(e.x + Angles.trnsx(a,2) + x + Angles.trnsx(a,4)*e.fout(),
                    e.y + Angles.trnsy(a,2) + y + Angles.trnsy(a,4)*e.fout(), e.fslope()*0.8);
    }}));
});
const blockType = extend(Block, "chrono-liquid-pusher", {
    load() {
        this.super$load();
        this.region   = lib.loadRegion("chrono-liquid-pusher");
        topRegion     = lib.loadRegion("chrono-liquid-pusher-top");
        bottomRegion  = lib.loadRegion("chrono-liquid-pusher-bottom");
        rotatorRegion = lib.loadRegion("chrono-liquid-pusher-rotator");
    },
    setStats() {
        this.super$setStats();
        this.stats.add(Stat.powerConnections, LINK_LIMIT, StatUnit.none);
        this.stats.add(Stat.range, range / Vars.tilesize, StatUnit.blocks);
    },
    setBars() {
        this.super$setBars();
        this.barMap.put("liquid", lib.func(e => new Bar(
            prov(() => e.liquidType == null ? Core.bundle.get("bar.liquid") : e.liquidType.localizedName),
            prov(() => e.liquidType == null ? Pal.gray : e.liquidType.barColor),
            floatp(() => e.liquidType == null ? 0 : e.liquids.get(e.liquidType) / e.block.liquidCapacity)
        )));
        this.barMap.put("connections", lib.func(e => new Bar(
            prov(() => Core.bundle.format("bar.powerlines", e.getLinks().size, LINK_LIMIT)),
            prov(() => Pal.items),
            floatp(() => e.getLinks().size / LINK_LIMIT)
        )));
    },
    drawPlace(x, y, rotation, valid) { Drawf.dashCircle(x * Vars.tilesize, y * Vars.tilesize, range, Pal.accent); },
    pointConfig(config, transformer) {
        if (!IntSeq.__javaObject__.isInstance(config)) return config;
        let ns = new IntSeq(config.size); let lx = null;
        for (let i = 0; i < config.size; i++) {
            let n = config.get(i);
            if (lx == null) { lx = n; }
            else { let p = new Point2(lx*2-1, n*2-1); transformer.get(p); ns.add((p.x+1)/2); ns.add((p.y+1)/2); lx = null; }
        }
        return ns;
    },
});
blockType.buildVisibility  = BuildVisibility.shown;
blockType.category         = Category.liquid;
blockType.size             = 1;
blockType.health           = 300;
blockType.update           = true;
blockType.solid            = true;
blockType.hasLiquids       = true;
blockType.outputsLiquid    = false;
blockType.configurable     = true;
blockType.saveConfig       = false;
blockType.liquidCapacity   = 200;
blockType.noUpdateDisabled = true;
blockType.requirements     = ItemStack.with();

blockType.config(IntSeq, lib.cons2((tile, sq) => {
    let links = new Seq(java.lang.Integer), lx = null;
    for (let i = 0; i < sq.size; i++) {
        let n = sq.get(i);
        if (lx == null) lx = n;
        else { links.add(lib.int(Point2.pack(lx + tile.tileX(), n + tile.tileY()))); lx = null; }
    }
    tile.setLink(links);
}));
blockType.config(java.lang.Integer, lib.cons2((tile, int) => { tile.setOneLink(int); }));
blockType.config(Liquid, lib.cons2((tile, liquid) => { tile.setLiquidTypeId(liquid == null ? -1 : liquid.id); }));
blockType.configClear(tile => { tile.setLiquidTypeId(-1); });

const rdcGroup = new EntityGroup(Building, false, false);
blockType.buildType = prov(() => {
    const MAX_LOOP = 50, FRAME_DELAY = 5;
    const timer = new Interval(2);
    let liquidType = null, links = new Seq(java.lang.Integer), deadLinks = new Seq(java.lang.Integer);
    let warmup = 0, rotateDeg = 0, rotateSpeed = 0, liquidSent = false;
    const looper = (() => { let idx = 0; return { next(m) { if (idx < 0) idx = m-1; let v = idx; idx--; return v; } }; })();
    function lvt(the, t) { return t && t.team == the.team && the.within(t, range); }
    function lv(the, pos) { if (pos == null || pos == -1) return false; return lvt(the, Vars.world.build(pos)); }
    return extend(Building, {
        get liquidType() { return liquidType; },
        set liquidType(v) { liquidType = v; },
        getLinks() { return links; },
        setLink(v) {
            links = v == null ? new Seq(java.lang.Integer) : v;
            for (let i = links.size-1; i >= 0; i--) {
                let t = Vars.world.build(links.get(i));
                if (!lvt(this, t)) links.remove(i); else links.set(i, lib.int(t.pos()));
            }
        },
        setOneLink(v) {
            let int = new java.lang.Integer(v);
            if (!links.remove(boolf(i => i == int))) links.add(int);
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
        setLiquidTypeId(v) { liquidType = (v == null || v < 0) ? null : Vars.content.liquids().get(v); },
        updateTile() {
            if (timer.get(0, FRAME_DELAY)) {
                liquidSent = false;
                if (liquidType != null && this.efficiency > 0) {
                    let have = this.liquids.get(liquidType);
                    if (have > 0.001) {
                        let max = links.size;
                        for (let i = 0; i < Math.min(MAX_LOOP, max); i++) {
                            let idx = looper.next(max), pos = links.get(idx);
                            if (pos == null || pos == -1) { this.configure(lib.int(pos)); continue; }
                            let lt = Vars.world.build(pos);
                            if (!lvt(this, lt)) { this.deadLink(pos); if (--max <= 0) break; continue; }
                            if (!lt.block.hasLiquids) continue;
                            let space = lt.block.liquidCapacity - lt.liquids.get(liquidType);
                            let amount = Math.min(have, Math.min(space, TRANSFER_RATE));
                            if (amount > 0.001) {
                                lt.liquids.add(liquidType, amount);
                                this.liquids.remove(liquidType, amount);
                                have -= amount;
                                liquidSent = true;
                            }
                            if (have <= 0.001) break;
                        }
                    }
                }
            }
            if (this.efficiency > 0) {
                warmup = Mathf.lerpDelta(warmup, links.isEmpty() ? 0 : 1, warmupSpeed);
                rotateSpeed = Mathf.lerpDelta(rotateSpeed, liquidSent ? 1 : 0, warmupSpeed);
            } else {
                warmup = Mathf.lerpDelta(warmup, 0, warmupSpeed);
                rotateSpeed = Mathf.lerpDelta(rotateSpeed, 0, warmupSpeed);
            }
            if (warmup > 0) rotateDeg += rotateSpeed;
            if (liquidSent && rotateSpeed > 0.5 && Mathf.random(60) > 48)
                Time.run(Mathf.random(10), run(() => { inEffect.at(this.x, this.y, 0); }));
        },
        draw() {
            this.super$draw();
            Draw.alpha(warmup); Draw.rect(bottomRegion, this.x, this.y); Draw.color();
            Draw.alpha(warmup); Draw.rect(rotatorRegion, this.x, this.y, -rotateDeg);
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
            Drawf.dashCircle(this.x, this.y, range, Pal.accent);
            if (this.enabled && rotateSpeed > 0.5 && Mathf.random(60) > 48)
                Time.run(Mathf.random(10), run(() => { inEffect.at(this.x, this.y, 0); }));
        },
        onConfigureBuildTapped(other) {
            if (this == other) return false;
            if (this.dst(other) <= range && other.team == this.team) { this.configure(new java.lang.Integer(other.pos())); return false; }
            return true;
        },
        buildConfiguration(table) {
            ItemSelection.buildTable(table, Vars.content.liquids(), prov(() => liquidType), cons(v => { this.configure(v); }));
        },
        config() {
            let out = new IntSeq(links.size*2);
            for (let i = 0; i < links.size; i++) { let p = Point2.unpack(links.get(i)).sub(this.tile.x, this.tile.y); out.add(p.x, p.y); }
            return out;
        },
        acceptLiquid(source, liquid) { return liquidType != null && liquid == liquidType; },
        add() { if (this.added) return; rdcGroup.add(this); this.super$add(); },
        remove() { if (!this.added) return; rdcGroup.remove(this); this.super$remove(); },
        version() { return 1; },
        write(write) {
            this.super$write(write);
            write.s(liquidType == null ? -1 : liquidType.id); write.s(links.size);
            let it = links.iterator(); while (it.hasNext()) write.i(it.next());
        },
        read(read, revision) {
            this.super$read(read, revision);
            let id = read.s(); liquidType = id == -1 ? null : Vars.content.liquids().get(id);
            links = new Seq(java.lang.Integer);
            let sz = read.s(); for (let i = 0; i < sz; i++) links.add(new java.lang.Integer(read.i()));
        },
    });
});
Events.on(BlockBuildEndEvent, cons(e => {
    if (!e.breaking) rdcGroup.each(cons(cen => { cen.tryResumeDeadLink(e.tile.pos()); }));
}));

module.exports = blockType;
