
const lib = require("lib");
const range = 1200, warmupSpeed = 0.05;
let topRegion, bottomRegion, rotatorRegion;
const BLUE = Color.valueOf("#0068fc");
const outEffect = lib.newEffect(38, e => {
    Draw.color(BLUE);
    Angles.randLenVectors(e.id, 1, 8 * e.fin(), 0, 360, new Floatc2({ get: (x, y) => {
        let a = Angles.angle(0, 0, x, y);
        Fill.circle(e.x + Angles.trnsx(a,2) + x + Angles.trnsx(a,4)*e.fin(),
                    e.y + Angles.trnsy(a,2) + y + Angles.trnsy(a,4)*e.fin(), e.fslope()*0.8);
    }}));
});
const blockType = extend(StorageBlock, "chrono-unloader", {
    load() {
        this.super$load();
        topRegion     = lib.loadRegion("chrono-unloader-top");
        bottomRegion  = lib.loadRegion("chrono-unloader-bottom");
        rotatorRegion = lib.loadRegion("chrono-unloader-rotator");
    },
    init() { this.super$init(); this.acceptsItems = false; },
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
    outputsItems() { return true; },
    pointConfig(config, transformer) {
        if (!IntSeq.__javaObject__.isInstance(config)) return config;
        let ns = new IntSeq(config.size);
        ns.add(config.get(0)); ns.add(config.get(1));
        let lx = null;
        for (let i = 2; i < config.size; i++) {
            let n = config.get(i);
            if (lx == null) { lx = n; }
            else { let p = new Point2(lx*2-1, n*2-1); transformer.get(p); ns.add((p.x+1)/2); ns.add((p.y+1)/2); lx = null; }
        }
        return ns;
    },
});
blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked  = true;
blockType.category        = Category.distribution;
blockType.size            = 1;
blockType.health          = 2147483647;
blockType.buildCost       = 0.001;
blockType.update          = true;
blockType.solid           = true;
blockType.hasItems        = true;
blockType.configurable    = true;
blockType.saveConfig      = false;
blockType.itemCapacity    = 100;
blockType.noUpdateDisabled = true;
blockType.requirements    = ItemStack.with();

blockType.config(IntSeq, lib.cons2((tile, seq) => {
    let lc = seq.get(1), lx = null, nl = new Seq(true, lc, java.lang.Integer);
    for (let i = 2; i < 2 + lc*2; i++) { let n = seq.get(i); if (lx == null) lx = n; else { nl.add(lib.int(Point2.pack(lx + tile.tileX(), n + tile.tileY()))); lx = null; } }
    tile.setItemTypeId(seq.get(0)); tile.setLinks(nl);
    if (seq.size > 2 + lc*2) tile.setAutoFlagsFromSeq(seq, 2 + lc*2);
}));
blockType.config(java.lang.Integer, lib.cons2((tile, int) => { tile.setOneLink(int); }));
blockType.config(Item, lib.cons2((tile, item) => { tile.setItemTypeId(item.id); }));
blockType.configClear(tile => { tile.setItemTypeId(null); });

const theGroup = new EntityGroup(Building, false, false);
blockType.buildType = prov(() => {
    const MAX_LOOP = 100, FRAME_DELAY = 5;
    const timer = new Interval(6);
    let itemType = null, links = new Seq(java.lang.Integer), deadLinks = new Seq(java.lang.Integer);
    let autoFlags = [false, false, false, false, false, false];
    let slowdownDelay = 0, warmup = 0, rotateDeg = 0, rotateSpeed = 0, consValid = false;
    const looper = (() => { let idx = 0; return { next(m) { if (idx < 0 || idx >= m) idx = m-1; let v = idx; idx--; return v; } }; })();
    function lvt(the, t) { return t && t.team == the.team && t.items != null && the.within(t, range); }
    function lv(the, pos) { if (pos == null || pos == -1) return false; return lvt(the, Vars.world.build(pos)); }
    const clearFn = () => { let s = new IntSeq(2); s.add(itemType == null ? -1 : itemType.id); s.add(0); return s; };
    const scanJob = lib.makeScanJob(autoFlags, 20);
    return new JavaAdapter(StorageBlock.StorageBuild, {
        getLinks() { return links; },
        getItemType() { return itemType; },
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
        setAutoFlagsFromSeq(seq, offset) { for (let i = 0; i < 6; i++) autoFlags[i] = seq.get(offset + i) > 0; },
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
        setItemTypeId(v) { itemType = (!v && v !== 0 || v < 0) ? null : Vars.content.items().get(v); },
        updateTile() {
            let hasItem = false;
            if (timer.get(1, FRAME_DELAY)) {
                if (itemType != null && (consValid = this.efficiency > 0)) {
                    let max = links.size;
                    for (let i = 0; i < Math.min(MAX_LOOP, max); i++) {
                        let idx = looper.next(max), pos = links.get(idx);
                        if (pos == null || pos == -1) { this.configure(lib.int(pos)); continue; }
                        let lt = Vars.world.build(pos);
                        if (!lvt(this, lt)) { this.deadLink(pos); if (--max <= 0) break; continue; }
                        let cnt = lt.items.get(itemType);
                        let acc = Math.min(cnt, this.acceptStack(itemType, Math.min(cnt, 500), lt));
                        if (acc > 0) {
                            this.handleStack(itemType, acc, lt);
                            lt.removeStack(itemType, acc);
                            for (let t = acc; t > 0; t--) lt.itemTaken(itemType);
                            for (let t = 0; t < FRAME_DELAY; t++) this.dump();
                            hasItem = true;
                        }
                    }
                }
                if (consValid && hasItem) slowdownDelay = 60;
                else if (!consValid) slowdownDelay = 0;
                if (this.enabled && rotateSpeed > 0.5 && Mathf.random(60) > 12)
                    Time.run(Mathf.random(10), run(() => { outEffect.at(this.x, this.y, 0); }));
                for (let i = 0; i < FRAME_DELAY; i++) this.dump();
            }
            scanJob.tick(this, () => links, lvt, clearFn);
            warmup = Mathf.lerpDelta(warmup, consValid ? 1 : 0, warmupSpeed);
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
            Draw.color(itemType == null ? Color.clear : itemType.color);
            Draw.rect("unloader-center", this.x, this.y); Draw.color();
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
        },
        onConfigureBuildTapped(other) {
            if (this == other) { this.configure(-1); return false; }
            if (this.dst(other) <= range && other.team == this.team) { this.configure(new java.lang.Integer(other.pos())); return false; }
            return true;
        },
        buildConfiguration(table) {
            table.table(cons(t => {
                lib.addAutoConnectButtons(t, this, () => links, lvt, clearFn, autoFlags);
            })).row();
            table.table(cons(t => {
                ItemSelection.buildTable(t, Vars.content.items(), prov(() => itemType), cons(v => { this.configure(v); }));
            })).row();
        },
        config() {
            let seq = new IntSeq(links.size*2+8);
            seq.add(itemType == null ? -1 : itemType.id); seq.add(links.size);
            for (let i = 0; i < links.size; i++) { let p = Point2.unpack(links.get(i)).sub(this.tile.x, this.tile.y); seq.add(p.x, p.y); }
            for (let i = 0; i < 6; i++) seq.add(autoFlags[i] ? 1 : 0);
            return seq;
        },
        outputsItems() { return true; },
        add() { if (this.added) return; theGroup.add(this); this.super$add(); },
        remove() { if (!this.added) return; theGroup.remove(this); this.super$remove(); },
        version() { return 4; },
        canDump(to, item) { return this.linkedCore == null && !links.contains(boolf(pos => { return to == Vars.world.build(pos); })); },
        acceptItem(source, item) { return this.linkedCore != null; },
        acceptStack(item, amount, source) {
            if (this.linkedCore != null) return this.linkedCore.acceptStack(item, amount, source);
            return (source == null || source.team == this.team) ? Math.min(this.getMaximumAccepted(item) - this.items.get(item), amount) : 0;
        },
        write(write) {
            this.super$write(write);
            write.s(itemType == null ? -1 : itemType.id); write.s(links.size);
            let it = links.iterator(); while (it.hasNext()) write.i(it.next());
            write.bool(autoFlags[0]); write.bool(autoFlags[1]); write.bool(autoFlags[2]); write.bool(autoFlags[3]); write.bool(autoFlags[4]); write.bool(autoFlags[5]);
        },
        read(read, revision) {
            this.super$read(read, revision);
            let id = read.s(); itemType = id == -1 ? null : Vars.content.items().get(id);
            links = new Seq(java.lang.Integer);
            let sz = read.s(); for (let i = 0; i < sz; i++) links.add(new java.lang.Integer(read.i()));
            if (revision >= 3) { autoFlags[0] = read.bool(); autoFlags[1] = read.bool(); autoFlags[2] = read.bool(); autoFlags[3] = read.bool(); }
            if (revision >= 4) { autoFlags[4] = read.bool(); autoFlags[5] = read.bool(); }
        },
    }, blockType);
});
Events.on(BlockBuildEndEvent, cons(e => {
    if (!e.breaking) theGroup.each(cons(cen => { cen.tryResumeDeadLink(e.tile.pos()); }));
}));

module.exports = blockType;
