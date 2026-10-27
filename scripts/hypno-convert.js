const lib = require("lib");

const CoreBlockClass = Packages.mindustry.world.blocks.storage.CoreBlock;
const CONVERT_RING_GROWTH = 16;

const CONVERT_EFFECT = lib.newEffect(40, e => {
    Draw.color(Pal.sapBullet);
    Lines.stroke(3 * e.fout());
    Lines.circle(e.x, e.y, e.rotation + CONVERT_RING_GROWTH * e.fin());
    Draw.reset();
});

function isUnit(target) {
    return target != null && target instanceof Unit;
}

function isBuilding(target) {
    return target != null && target instanceof Building;
}

function canConvert(target, team) {
    if (target == null || team == null) return false;
    if (target.team == team || target.team == Team.derelict) return false;
    if (isUnit(target)) return !target.dead && target.isAdded();
    if (isBuilding(target)) return target.isValid() && !(target.block instanceof CoreBlockClass);
    return false;
}

function convert(target, team) {
    if (Vars.net.client()) return false;
    if (!canConvert(target, team)) return false;
    if (isUnit(target)) {
        if (target.isPlayer()) target.getPlayer().clearUnit();
        // Rhino maps `team` to the field and a plain assignment does not stick, so call the setter by reflection.
        target.getClass().getMethod("team", Team).invoke(target, team);
        target.resetController();
        CONVERT_EFFECT.at(target.x, target.y, target.hitSize / 2 + 2);
        Fx.spawn.at(target.x, target.y);
        return true;
    }
    Call.setTeam(target, team);
    CONVERT_EFFECT.at(target.x, target.y, target.block.size * Vars.tilesize / 2 + 2);
    Fx.placeBlock.at(target.x, target.y, target.block.size);
    return true;
}

exports.isUnit = isUnit;
exports.isBuilding = isBuilding;
exports.canConvert = canConvert;
exports.convert = convert;
