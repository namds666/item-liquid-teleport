const lib = require("lib");
const rules = require("hypno-rules");
const convertRules = require("hypno-convert");

const CommandAIClass = Packages.mindustry.ai.types.CommandAI;
const states = {};

const yuriType = extend(UnitType, "yuri", {
    update(unit) {
        this.super$update(unit);
        if (Vars.net.client()) return;
        pruneStates();

        let st = stateOf(unit);
        st.seen = true;
        let owner = st.owner != null && st.owner.isValid() ? st.owner : null;
        let range = (owner != null ? owner.hypnoRange() : rules.rangeTiles(0) * rules.TILE);
        let channel = owner != null ? owner.hypnoChannel() : rules.channelTicks(0);

        let ai = unit.controller();
        if (ai instanceof CommandAIClass) {
            let wanted = ai.attackTarget;
            if (wanted != null && wanted !== st.target && convertRules.canConvert(wanted, unit.team)) {
                st.target = wanted;
                st.progress = 0;
            }
        }

        if (st.target != null && !convertRules.canConvert(st.target, unit.team)) {
            st.target = null;
            st.progress = 0;
        }

        if (st.target == null) {
            st.target = acquire(unit, range);
            st.progress = 0;
        }

        if (st.target == null) return;
        st.progress += Time.delta;
        if (st.progress >= channel) {
            convertRules.convert(st.target, unit.team);
            st.target = null;
            st.progress = 0;
        }
    },

    draw(unit) {
        this.super$draw(unit);
        if (Vars.headless) return;
        let st = states[unit.id];
        if (st == null || st.unit !== unit || st.target == null) return;
        let target = st.target;
        let channel = st.owner != null && st.owner.isValid() ? st.owner.hypnoChannel() : rules.channelTicks(0);
        let radius = convertRules.isBuilding(target) ? target.block.size * rules.TILE / 2 + 2 : Math.max(target.hitSize / 2 + 2, 4);
        Draw.z(Layer.effect);
        Draw.color(Pal.sapBullet);
        Lines.stroke(1.5);
        Lines.line(unit.x, unit.y, target.x, target.y);
        Lines.stroke(2);
        Lines.arc(target.x, target.y, radius, Mathf.clamp(st.progress / channel));
        Draw.reset();
    }
});
yuriType.constructor = prov(() => MechUnit.create());
yuriType.health = rules.YURI_HEALTH;
yuriType.speed = rules.YURI_SPEED;
yuriType.hitSize = rules.YURI_HIT_SIZE;
yuriType.drawCell = false;
yuriType.canBoost = false;
yuriType.useUnitCap = false;
yuriType.range = rules.RANGE_LEVELS[rules.MAX_LEVEL] * rules.TILE;
yuriType.maxRange = yuriType.range;
yuriType.alwaysUnlocked = true;
lib.enableAllEnvironments(yuriType);

function stateOf(unit) {
    let st = states[unit.id];
    if (st == null || st.unit !== unit) {
        st = { unit: unit, owner: st != null && st.unit === unit ? st.owner : null, target: null, progress: 0, seen: false };
        states[unit.id] = st;
    }
    return st;
}

function pruneStates() {
    for (let id in states) {
        let st = states[id];
        if (st.unit.dead || (st.seen && !st.unit.isAdded())) delete states[id];
    }
}

function acquire(unit, range) {
    let team = unit.team;
    let u = Units.closestEnemy(team, unit.x, unit.y, range, boolf(e => convertRules.canConvert(e, team)));
    let b = Vars.indexer.findEnemyTile(team, unit.x, unit.y, range, boolf(e => convertRules.canConvert(e, team)));
    if (u == null) return b;
    if (b == null) return u;
    return unit.dst2(u) <= unit.dst2(b) ? u : b;
}

exports.yuriType = yuriType;
exports.adopt = function(unit, owner) {
    let st = states[unit.id];
    if (st == null || st.unit !== unit) {
        st = { unit: unit, owner: null, target: null, progress: 0, seen: false };
        states[unit.id] = st;
    }
    st.owner = owner;
};
exports.ownerOf = function(unit) {
    let st = states[unit.id];
    return st != null && st.unit === unit ? st.owner : null;
};
exports.tetherOf = function(unit) {
    let st = states[unit.id];
    if (st == null || st.unit !== unit || st.target == null) return null;
    return { target: st.target, progress: st.progress };
};
