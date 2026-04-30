
const lib = require("lib");
const warmupSpeed = 0.05;
let topRegion, bottomRegion, rotatorRegion;
const ORANGE = Color.valueOf("#fea947");
const inEffect = lib.newEffect(38, e => {
    Draw.color(ORANGE);
    Angles.randLenVectors(e.id, 1, 8 * e.fin(), 0, 360, new Floatc2({ get: (x, y) => {
        let a = Angles.angle(0, 0, x, y);
        Fill.circle(e.x + Angles.trnsx(a,2) + x + Angles.trnsx(a,4)*e.fin(),
                    e.y + Angles.trnsy(a,2) + y + Angles.trnsy(a,4)*e.fin(), e.fslope()*0.8);
    }}));
});
const blockType = extend(StorageBlock, "chrono-pusher", {
    load() {
        this.super$load();
        topRegion     = lib.loadRegion("chrono-pusher-top");
        bottomRegion  = lib.loadRegion("chrono-pusher-bottom");
        rotatorRegion = lib.loadRegion("chrono-pusher-rotator");
    },
    setBars() {
        this.super$setBars();
        this.barMap.put("capacity", lib.func(e => new Bar(
            prov(() => Core.bundle.format("bar.capacity", UI.formatAmount(e.block.itemCapacity))),
            prov(() => Pal.items),
            floatp(() => e.items.total() / (e.block.itemCapacity * Vars.content.items().count(boolf(i => i.unlockedNow()))))
        )));
    },
    outputsItems() { return false; },
    pointConfig(config, transformer) {
        if (lib.isStringConfig(config)) return lib.pointTransportConfig(config, transformer);
        if (!IntSeq.__javaObject__.isInstance(config)) return config;
        if (config.size < 1) return config;
        // v3 format is even-sized (2 + lc*2 + 6); all older formats are odd-sized (1 + lc*2 + autoFlagCount)
        let isV3 = (config.size % 2 == 0);
        let selectedId = isV3 ? config.get(0) : -1;
        let lc         = isV3 ? config.get(1) : config.get(0);
        let linkStart  = isV3 ? 2 : 1;
        let afterLinks = linkStart + lc * 2;
        let ns = new IntSeq(config.size + (isV3 ? 0 : 1));
        ns.add(selectedId); ns.add(lc);
        for (let i = 0; i < lc; i++) {
            let base = linkStart + i*2;
            if (base + 1 >= config.size) break;
            let p = new Point2(config.get(base)*2-1, config.get(base+1)*2-1);
            transformer.get(p);
            ns.add((p.x+1)/2); ns.add((p.y+1)/2);
        }
        for (let i = afterLinks; i < config.size; i++) ns.add(config.get(i));
        return ns;
    },
});
blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked  = true;
blockType.category        = Category.distribution;
blockType.health          = 2147483647;
blockType.buildCost       = 0.001;
blockType.update          = true;
blockType.solid           = true;
blockType.hasItems        = true;
blockType.configurable    = true;
blockType.saveConfig      = false;
blockType.itemCapacity    = 10000;
blockType.noUpdateDisabled = true;
blockType.requirements    = ItemStack.with();
lib.enableAllEnvironments(blockType);

blockType.config(IntSeq, lib.cons2((tile, sq) => {
    // v3 format (even size): [selectedItemId, lc, x0,y0,..., af0..af5]
    // old format (odd size):  [lc, x0,y0,..., af0..af5]  (no selectedItemId)
    if (sq.size == 0) { tile.setLink(new Seq(java.lang.Integer)); return; }
    let isV3 = (sq.size % 2 == 0);
    let selectedId = isV3 ? sq.get(0) : -1;
    let lc         = isV3 ? sq.get(1) : sq.get(0);
    let linkStart  = isV3 ? 2 : 1;
    tile.setSelectedItemId(selectedId);
    let lx = null;
    let links = new Seq(java.lang.Integer);
    for (let i = linkStart; i < Math.min(linkStart + lc*2, sq.size); i++) {
        let n = sq.get(i);
        if (lx == null) lx = n; else { links.add(lib.int(Point2.pack(lx + tile.tileX(), n + tile.tileY()))); lx = null; }
    }
    tile.setLink(links);
    let autoStart = linkStart + lc*2;
    if (sq.size >= autoStart + 6) tile.setAutoFlagsFromSeq(sq, autoStart);
}));
blockType.config(java.lang.String, lib.cons2((tile, text) => {
    let cfg = lib.readTransportConfig(text, tile.tileX(), tile.tileY());
    if (cfg == null) return;
    tile.setSelectedItemId(cfg.selectedId);
    tile.setLink(cfg.links);
    tile.setAutoFlagsFromArray(cfg.autoFlags);
}));
blockType.config(java.lang.Integer, lib.cons2((tile, int) => { if (int < 0) tile.setSelectedItemId(-1); else tile.setOneLink(int); }));
blockType.config(Item, lib.cons2((tile, item) => { tile.setSelectedItemId(item == null ? -1 : item.id); }));
blockType.configClear(tile => { tile.setLink(new Seq(java.lang.Integer)); });

const rdcGroup = new EntityGroup(Building, false, false);
blockType.buildType = prov(() => {
    const MAX_LOOP = 50, FRAME_DELAY = 5;
    const timer = new Interval(6);
    let links = new Seq(java.lang.Integer), deadLinks = new Seq(java.lang.Integer);
    let autoFlags = [false, false, false, false, false, false];
    let selectedItem = null;
    let warmup = 0, rotateDeg = 0, rotateSpeed = 0, consValid = false, itemSent = false;
    const looper = (() => { let idx = 0; return { next(m) { if (idx < 0 || idx >= m) idx = m-1; let v = idx; idx--; return v; } }; })();
    function lvt(the, t) { return t && t.team == the.team; }
    function lv(the, pos) { if (pos == null || pos == -1) return false; return lvt(the, Vars.world.build(pos)); }
    const clearFn = () => new IntSeq();
    const scanJob = lib.makeScanJob(autoFlags, 50);
    const batchApply = lib.makeBatchApply(() => links);
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
        setAutoFlagsFromSeq(seq, offset) { for (let i = 0; i < 6; i++) autoFlags[i] = seq.get(offset + i) > 0; },
        setAutoFlagsFromArray(values) { for (let i = 0; i < 6; i++) autoFlags[i] = !!values[i]; },
        setSelectedItemId(v) { selectedItem = (v == null || v < 0) ? null : Vars.content.items().get(v); },
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
                    if (selectedItem != null) {
                        // Filter mode: only push the selected item
                        let cnt = this.items.get(selectedItem);
                        if (cnt > 0) tmpHave.push({ item: selectedItem, count: cnt });
                    } else {
                        // Push everything
                        for (let i = 0; i < Vars.content.items().size; i++) {
                            let item = Vars.content.items().get(i), cnt = this.items.get(item);
                            if (cnt > 0) tmpHave.push({ item: item, count: cnt });
                        }
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
            scanJob.tick(this, () => links, lvt, clearFn, batchApply);
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
            if (this.enabled && rotateSpeed > 0.5 && Mathf.random(60) > 48)
                Time.run(Mathf.random(10), run(() => { inEffect.at(this.x, this.y, 0); }));
        },
        onConfigureBuildTapped(other) {
            if (this == other) return false;
            if (other.team == this.team) { this.configure(new java.lang.Integer(other.pos())); return false; }
            return true;
        },
        buildConfiguration(table) {
            table.table(cons(t => {
                lib.addAutoConnectButtons(t, this, () => links, lvt, clearFn, autoFlags);
            })).row();
            table.table(cons(t => {
                ItemSelection.buildTable(t, Vars.content.items(), prov(() => selectedItem), cons(v => { this.configure(v == null ? new java.lang.Integer(-1) : v); }));
            })).row();
        },
        config() {
            return lib.transportConfig(selectedItem == null ? -1 : selectedItem.id, links, this.tile.x, this.tile.y, autoFlags);
        },
        acceptStack(item, amount, source) {
            return this.linkedCore == null ? this.super$acceptStack(item, amount, source) : this.linkedCore.acceptStack(item, amount, source);
        },
        add() { if (this.added) return; rdcGroup.add(this); this.super$add(); },
        remove() { if (!this.added) return; rdcGroup.remove(this); this.super$remove(); },
        version() { return 3; },
        write(write) {
            this.super$write(write);
            write.s(selectedItem == null ? -1 : selectedItem.id);
            write.s(links.size);
            let it = links.iterator(); while (it.hasNext()) write.i(it.next());
            write.bool(autoFlags[0]); write.bool(autoFlags[1]); write.bool(autoFlags[2]); write.bool(autoFlags[3]); write.bool(autoFlags[4]); write.bool(autoFlags[5]);
        },
        read(read, revision) {
            this.super$read(read, revision);
            if (revision >= 3) { let id = read.s(); selectedItem = id < 0 ? null : Vars.content.items().get(id); }
            links = new Seq(java.lang.Integer);
            let sz = read.s(); for (let i = 0; i < sz; i++) links.add(new java.lang.Integer(read.i()));
            if (revision >= 1) { autoFlags[0] = read.bool(); autoFlags[1] = read.bool(); autoFlags[2] = read.bool(); autoFlags[3] = read.bool(); }
            if (revision >= 2) { autoFlags[4] = read.bool(); autoFlags[5] = read.bool(); }
        },
    }, blockType);
});
Events.on(BlockBuildEndEvent, cons(e => {
    if (!e.breaking) rdcGroup.each(cons(cen => { cen.tryResumeDeadLink(e.tile.pos()); }));
}));

module.exports = blockType;
