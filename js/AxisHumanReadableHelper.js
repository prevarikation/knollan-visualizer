'use strict';
class AxisHumanReadableHelper {}
AxisHumanReadableHelper.moveTo = function(type) {
    const adaptedType = type.slice(0, 1).toUpperCase() + type.slice(1);
    return AxisHumanReadableHelper[`moveTo${adaptedType}`];
};
AxisHumanReadableHelper.moveToLong = function(move) {
    const isPartial = AxisMoves.isPartialMove(move);
    if (isPartial) {
        move = AxisMoves.normalizedMoveDirection(move);
    }
    return {
        [AxisMoves.MOVE_UP]: "Up", [AxisMoves.MOVE_LEFT]: "Left", [AxisMoves.MOVE_DOWN]: "Down", [AxisMoves.MOVE_RIGHT]: "Right",
    }[move][isPartial ? 'toLowerCase' : 'slice']();
}
AxisHumanReadableHelper.moveToShort = function(move) {
    return AxisHumanReadableHelper.moveToLong(move).slice(0, 1);
}

AxisHumanReadableHelper.diskTo = function(type) {
    const adaptedType = type.slice(0, 1).toUpperCase() + type.slice(1);
    return AxisHumanReadableHelper[`diskTo${adaptedType}`];
};
AxisHumanReadableHelper.diskToLong = function(disk) {
    return {
        [AxisDisk.DISK_TOP]: "Top", [AxisDisk.DISK_LEFT]: "Left", [AxisDisk.DISK_BOTTOM]: "Bottom", [AxisDisk.DISK_RIGHT]: "Right"
    }[disk];
};
AxisHumanReadableHelper.diskToShort = function(disk) {
    return AxisHumanReadableHelper.diskToLong(disk).slice(0, 1);
}

// doesn't support partial moves
AxisHumanReadableHelper.readableMoveToMove = function(readable) {
    return {
        U: AxisMoves.MOVE_UP, L: AxisMoves.MOVE_LEFT, D: AxisMoves.MOVE_DOWN, R: AxisMoves.MOVE_RIGHT
    }[readable.charAt(0).toUpperCase()];
}