
const lib = require("lib");
const range = 1200, warmupSpeed = 0.05;
let topRegion, bottomRegion, rotatorRegion;
const ORANGE = Color.valueOf("#fea947");
const inEffect = lib.newEffect(38, e => {
    Draw.color(ORANGE);
    Angles.randLenVectors(e.id, 1, 8 * e.fout(), 0, 360, new Floatc2({ get: (x, y) => {
        let a = Angles.angle(0, 0, x, y);
        Fill.circle(e.x + Angles.trnsx(a,2) + x + Angles.trnsx(a,4)*e.fout(),
                    e.y + Angles.trnsy(a,2) + y + Angles.trnsy(a,4)*e.fout(), e.fslope()*0.8);
    }}));
});
const blockType = extend(StorageBlock, "chrono-pusher", {
    load() {
        this.super$load();
        topRegion     = lib.loadRegion("chrono-pusher-top");
        bottomRegion  = lib.loadRegion("chrono-pusher-bottom");
        rotatorRegion = lib.loadRegion("chrono-pusher-rotator");
    },
    setStats() {
        this.super$setStats();
        this.stats.add(Stat.range, range / Vars.tilesize, StatUnit.blocks);
    },
    setBars() {
        this.super$setBars();
        this.barMap.put("capacity", lib.func(e => new Bar(
            prov(() => Core.bundle.format("bar.capacity", UI.formatAmount(e.block.itemCapacity))),
            prov(() => Pal.items),
            floatp(() => e.items.total() / (e.block.itemCapacity * Vars.content.items().count(boolf(i => i.unlockedNow()))))
        )));
    },
    drawPlace(x, y, rotation, valid) { Drawf.dashCircle(x * Vars.tilesize, y * Vars.tilesize, range, Pal.accent); },
    outputsItems() { return false; },
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
blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked  = true;
blockType.health          = 2147483647;
blockType.buildCost       = 0.001;
blockType.update          = true;
blockType.solid           = true;
blockType.hasItems        = true;
blockType.configurable    = true;
blockType.saveConfig      = false;
blockType.itemCapacity    = 10000;
blockType.noUpdateDisabled = true;

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
blockType.configClear(tile => { tile.setLink(new Seq(java.lang.Integer)); });

const rdcGroup = new EntityGroup(Building, false, false);
blockType.buildType = prov(() => {
    const MAX_LOOP = 50, FRAME_DELAY = 5;
    const timer = new Interval(6);
    let links = new Seq(java.lang.Integer), deadLinks = new Seq(java.lang.Integer);
    let warmup = 0, rotateDeg = 0, rotateSpeed = 0, consValid = false, itemSent = false;
    const looper = (() => { let idx = 0; return { next(m) { if (idx < 0 || idx >= m) idx = m-1; let v = idx; idx--; return v; } }; })();
    function lvt(the, t) { return t && t.team == the.team && the.within(t, range); }
    function lv(the, pos) { if (pos == null || pos == -1) return false; return lvt(the, Vars.world.build(pos)); }
    const tmpHave = [];
    return new JavaAdapter(StorageBlock.StorageBuild, {
        getLink() { return links; },
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
        sendItems(target, have) {
            let s = false;
            for (let i = have.length-1; i >= 0; i--) {
                let h = have[i], item = h.item, cnt = h.count;
                let acc = Math.min(cnt, target.acceptStack(item, Math.min(cnt, 500), this));
                if (acc > 0) {
                    s = true; target.handleStack(item, acc, this);
                    this.items.remove(item, acc); h.count -= acc;
                    if (h.count <= 0) have.splice(i, 1);
                }
            }
            return s;
        },
        updateTile() {
            tmpHave.splice(0, tmpHave.length);
            if (timer.get(1, FRAME_DELAY)) {
                itemSent = false; consValid = this.efficiency > 0;
                if (consValid) {
                    this.consume();
                    for (let i = 0; i < Vars.content.items().size; i++) {
                        let item = Vars.content.items().get(i), cnt = this.items.get(item);
                        if (cnt > 0) tmpHave.push({ item: item, count: cnt });
                    }
                    let max = links.size;
                    for (let i = 0; i < Math.min(MAX_LOOP, max); i++) {
                        let idx = looper.next(max), pos = links.get(idx);
                        if (pos == null || pos == -1) { this.configure(lib.int(pos)); continue; }
                        let lt = Vars.world.build(pos);
                        if (!lvt(this, lt)) { this.deadLink(pos); if (--max <= 0) break; continue; }
                        if (this.sendItems(lt, tmpHave)) itemSent = true;
                    }
                }
            }
            if (consValid) {
                warmup = Mathf.lerpDelta(warmup, links.isEmpty() ? 0 : 1, warmupSpeed);
                rotateSpeed = Mathf.lerpDelta(rotateSpeed, itemSent ? 1 : 0, warmupSpeed);
            } else {
                warmup = Mathf.lerpDelta(warmup, 0, warmupSpeed);
                rotateSpeed = Mathf.lerpDelta(rotateSpeed, 0, warmupSpeed);
            }
            if (warmup > 0) rotateDeg += rotateSpeed;
        },
        draw() {
            this.super$draw();
            Draw.alpha(warmup); Draw.rect(bottomRegion, this.x, this.y); Draw.color();
            Draw.alpha(warmup); Draw.rect(rotatorRegion, this.x, this.y, -rotateDeg);
            Draw.alpha(1); Draw.rect(topRegion, this.x, this.y);
        },
        display(table) {
            this.super$display(table);
            if (this.items != null) {
                table.row(); table.left();
                table.table(cons(l => {
                    let map = new ObjectMap();
                    l.update(run(() => {
                        l.clearChildren(); l.left();
                        let seq = new Seq(Item);
                        this.items.each(new ItemModule.ItemConsumer({ accept(item, amount) { map.put(item, amount); seq.add(item); } }));
                        map.each(lib.cons2((item, amount) => {
                            l.image(item.uiIcon).padRight(3.0);
                            l.label(prov(() => '  ' + Strings.fixed(seq.contains(item) ? amount : 0, 0))).color(Color.lightGray);
                            l.row();
                        }));
                    }));
                })).left();
            }
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
            lib.addAutoConnectButtons(table, this, links, lvt, () => new IntSeq());
        },
        config() {
            let out = new IntSeq(links.size*2);
            for (let i = 0; i < links.size; i++) { let p = Point2.unpack(links.get(i)).sub(this.tile.x, this.tile.y); out.add(p.x, p.y); }
            return out;
        },
        acceptStack(item, amount, source) {
            return this.linkedCore == null ? this.super$acceptStack(item, amount, source) : this.linkedCore.acceptStack(item, amount, source);
        },
        add() { if (this.added) return; rdcGroup.add(this); this.super$add(); },
        remove() { if (!this.added) return; rdcGroup.remove(this); this.super$remove(); },
        write(write) {
            this.super$write(write); write.s(links.size);
            let it = links.iterator(); while (it.hasNext()) write.i(it.next());
        },
        read(read, revision) {
            this.super$read(read, revision);
            links = new Seq(java.lang.Integer);
            let sz = read.s(); for (let i = 0; i < sz; i++) links.add(new java.lang.Integer(read.i()));
        },
    }, blockType);
});
Events.on(BlockBuildEndEvent, cons(e => {
    if (!e.breaking) rdcGroup.each(cons(cen => { cen.tryResumeDeadLink(e.tile.pos()); }));
}));

module.exports = blockType;
