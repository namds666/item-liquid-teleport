// Indexed by floor/overlay drop only; blocks on top are filtered at query time.
const TILE = Vars.tilesize;
const CHUNK = 8;
const SPAN = CHUNK * TILE;

let tiles = null;
let bw = 0, bh = 0;
let byItem = {};

function add(t) {
    const item = t.drop();
    if (item == null || t.overlay().wallOre || t.floor().wallOre) return;
    let buckets = byItem[item.id];
    if (buckets == null) buckets = byItem[item.id] = new Array(bw * bh);
    const b = Math.floor(t.x / CHUNK) + Math.floor(t.y / CHUNK) * bw;
    let list = buckets[b];
    if (list == null) list = buckets[b] = [];
    for (let i = 0; i < list.length; i++) if (list[i] == t) return;
    list.push(t);
}

function ensure() {
    const w = Vars.world.tiles;
    if (w == tiles) return;
    tiles = w;
    byItem = {};
    if (w == null) return;
    bw = Math.ceil(w.width / CHUNK);
    bh = Math.ceil(w.height / CHUNK);
    w.eachTile(cons(add));
}

Events.on(EventType.WorldLoadEvent, cons(() => { tiles = null; }));
const onFloorChange = cons(e => { if (tiles != null && e.tile != null) add(e.tile); });
Events.on(EventType.TileFloorChangeEvent, onFloorChange);
Events.on(EventType.TileOverlayChangeEvent, onFloorChange);

function axisGap(v, b) {
    const lo = b * SPAN, hi = lo + (CHUNK - 1) * TILE;
    return v < lo ? lo - v : v > hi ? v - hi : 0;
}

// Up to `max` tiles of `item` within `radius` world units of (x, y), nearest first.
exports.nearby = (item, x, y, radius, max, accept) => {
    const out = [];
    if (item == null || max <= 0) return out;
    ensure();
    const buckets = tiles == null ? null : byItem[item.id];
    if (buckets == null) return out;
    const cbx = Math.min(bw - 1, Math.max(0, Math.floor(Math.round(x / TILE) / CHUNK)));
    const cby = Math.min(bh - 1, Math.max(0, Math.floor(Math.round(y / TILE) / CHUNK)));
    const r2 = radius * radius;
    const maxD = Math.max(bw, bh);
    const found = [];
    const scan = (bx, by) => {
        if (bx < 0 || by < 0 || bx >= bw || by >= bh) return;
        const list = buckets[bx + by * bw];
        if (list == null) return;
        const gx = axisGap(x, bx), gy = axisGap(y, by);
        if (gx * gx + gy * gy > r2) return;
        for (let i = 0; i < list.length; i++) {
            const t = list[i];
            if (t.block() != Blocks.air || t.drop() != item) continue;
            const dx = t.worldx() - x, dy = t.worldy() - y, d2 = dx * dx + dy * dy;
            if (d2 > r2 || (accept != null && !accept(t))) continue;
            found.push({ tile: t, d2: d2 });
        }
    };
    for (let d = 0; d <= maxD; d++) {
        if (d == 0) scan(cbx, cby);
        else for (let k = -d; k <= d; k++) {
            scan(cbx + k, cby - d);
            scan(cbx + k, cby + d);
            if (k > -d && k < d) { scan(cbx - d, cby + k); scan(cbx + d, cby + k); }
        }
        const next = Math.max(0, Math.min(x - ((cbx - d) * SPAN - TILE), (cbx + d + 1) * SPAN - x,
            y - ((cby - d) * SPAN - TILE), (cby + d + 1) * SPAN - y));
        if (next > radius) break;
        if (found.length >= max) {
            found.sort((a, b) => a.d2 - b.d2);
            if (found[max - 1].d2 <= next * next) break;
        }
    }
    found.sort((a, b) => a.d2 - b.d2);
    for (let i = 0; i < found.length && i < max; i++) out.push(found[i].tile);
    return out;
};
