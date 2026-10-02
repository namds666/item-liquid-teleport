const lib = require("lib");
const rules = require("hypno-rules");
const convertRules = require("hypno-convert");

const CommandAIClass = Packages.mindustry.ai.types.CommandAI;
const states = {};
// Conversion progress belongs to the target, so every Yuri tethered to it adds its own rate: two Yuri convert twice as fast.
const progress = {};
const PROGRESS_KEEP = 30;

function create(cfg) {
    const yuriType = extend(UnitType, cfg.unitName, {
        update(unit) {
            this.super$update(unit);
            if (Vars.net.client()) return;
            pruneStates();

            let st = stateOf(unit);
            st.seen = true;
            let owner = st.owner != null && st.owner.isValid() ? st.owner : null;
            let channel = owner != null ? owner.hypnoChannel() : rules.channelTicks(0);

            let ai = unit.controller();
            if (ai instanceof CommandAIClass) {
                let wanted = ai.attackTarget;
                if (wanted != null && !isTethered(st, wanted) && convertRules.canConvert(wanted, unit.team)) {
                    if (st.tethers.length >= cfg.tethers) st.tethers.shift();
                    st.tethers.push({ target: wanted });
                }
            }

            st.tethers = st.tethers.filter(t => convertRules.canConvert(t.target, unit.team));
            while (st.tethers.length < cfg.tethers) {
                let target = acquire(unit, unit.type.range, st);
                if (target == null) break;
                st.tethers.push({ target: target });
            }

            for (let i = st.tethers.length - 1; i >= 0; i--) {
                let target = st.tethers[i].target, entry = progressOf(target);
                entry.frac += Time.delta / channel;
                entry.time = Time.time;
                if (entry.frac >= 1) {
                    convertRules.convert(target, unit.team);
                    delete progress[keyOf(target)];
                    st.tethers.splice(i, 1);
                }
            }
        },

        draw(unit) {
            this.super$draw(unit);
            if (Vars.headless) return;
            let st = states[unit.id];
            if (st == null || st.unit !== unit || st.tethers.length == 0) return;
            Draw.z(Layer.effect);
            Draw.color(Pal.sapBullet);
            for (let i = 0; i < st.tethers.length; i++) {
                let target = st.tethers[i].target, entry = progress[keyOf(target)];
                let radius = convertRules.isBuilding(target) ? target.block.size * rules.TILE / 2 + 2 : Math.max(target.hitSize / 2 + 2, 4);
                Lines.stroke(1.5);
                Lines.line(unit.x, unit.y, target.x, target.y);
                Lines.stroke(2);
                Lines.arc(target.x, target.y, radius, entry == null ? 0 : Mathf.clamp(entry.frac));
            }
            Draw.reset();
        }
    });
    yuriType.constructor = prov(() => MechUnit.create());
    yuriType.health = cfg.health;
    yuriType.speed = cfg.speed;
    yuriType.hitSize = cfg.hitSize;
    yuriType.drawCell = false;
    yuriType.canBoost = false;
    yuriType.useUnitCap = false;
    yuriType.range = rules.YURI_RANGE * rules.TILE;
    yuriType.maxRange = yuriType.range;
    yuriType.alwaysUnlocked = true;
    lib.enableAllEnvironments(yuriType);
    return yuriType;
}

function keyOf(target) {
    return convertRules.isBuilding(target) ? "b" + target.pos() : "u" + target.id;
}

function progressOf(target) {
    let key = keyOf(target), entry = progress[key];
    if (entry == null || entry.target !== target) {
        entry = { target: target, frac: 0, time: Time.time };
        progress[key] = entry;
    }
    return entry;
}

function isTethered(st, target) {
    return st.tethers.some(t => t.target === target);
}

function stateOf(unit) {
    let st = states[unit.id];
    if (st == null || st.unit !== unit) {
        st = { unit: unit, owner: null, tethers: [], seen: false };
        states[unit.id] = st;
    }
    return st;
}

function pruneStates() {
    for (let id in states) {
        let st = states[id];
        if (st.unit.dead || (st.seen && !st.unit.isAdded())) delete states[id];
    }
    for (let key in progress) {
        if (Time.time - progress[key].time > PROGRESS_KEEP) delete progress[key];
    }
}

function acquire(unit, range, st) {
    let team = unit.team;
    let ok = e => convertRules.canConvert(e, team) && !isTethered(st, e);
    let u = Units.closestEnemy(team, unit.x, unit.y, range, boolf(ok));
    let b = Vars.indexer.findEnemyTile(team, unit.x, unit.y, range, boolf(ok));
    if (u == null) return b;
    if (b == null) return u;
    return unit.dst2(u) <= unit.dst2(b) ? u : b;
}

exports.yuriType = create({
    unitName: "yuri",
    health: rules.YURI_HEALTH,
    speed: rules.YURI_SPEED,
    hitSize: rules.YURI_HIT_SIZE,
    tethers: rules.YURI_TETHERS
});
exports.yuriBigType = create({
    unitName: "yuri-big",
    health: rules.BIG_YURI_HEALTH,
    speed: rules.BIG_YURI_SPEED,
    hitSize: rules.BIG_YURI_HIT_SIZE,
    tethers: rules.BIG_YURI_TETHERS
});
exports.adopt = function(unit, owner) {
    stateOf(unit).owner = owner;
};
exports.ownerOf = function(unit) {
    let st = states[unit.id];
    return st != null && st.unit === unit ? st.owner : null;
};
exports.tethersOf = function(unit) {
    let st = states[unit.id];
    if (st == null || st.unit !== unit) return [];
    return st.tethers.map(t => { let entry = progress[keyOf(t.target)]; return { target: t.target, progress: entry == null ? 0 : entry.frac }; });
};
