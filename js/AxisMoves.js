class AxisMoves {
    // only statics in this class
}
AxisMoves.MOVE_UNAFFECTED = 0;
AxisMoves.MOVE_UP = 1;
AxisMoves.MOVE_LEFT = 2;
AxisMoves.MOVE_DOWN = 3;
AxisMoves.MOVE_RIGHT = 4;
AxisMoves.PARTIAL_MOVES_OFFSET = 5;
AxisMoves.PARTIAL_MOVE_UP = AxisMoves.MOVE_UP + AxisMoves.PARTIAL_MOVES_OFFSET;
AxisMoves.PARTIAL_MOVE_LEFT = AxisMoves.MOVE_LEFT + AxisMoves.PARTIAL_MOVES_OFFSET;
AxisMoves.PARTIAL_MOVE_DOWN = AxisMoves.MOVE_DOWN + AxisMoves.PARTIAL_MOVES_OFFSET;
AxisMoves.PARTIAL_MOVE_RIGHT = AxisMoves.MOVE_RIGHT + AxisMoves.PARTIAL_MOVES_OFFSET;
AxisMoves.DISK_TOP_TURN = 16;
AxisMoves.DISK_LEFT_TURN = AxisMoves.DISK_TOP_TURN + 2;
AxisMoves.DISK_BOTTOM_TURN = AxisMoves.DISK_TOP_TURN + 4;
AxisMoves.DISK_RIGHT_TURN = AxisMoves.DISK_TOP_TURN + 6;
AxisMoves.SERIALIZED_BASE = 32;
AxisMoves.SERIALIZED_MAX = AxisMoves.SERIALIZED_BASE + 50624; // (15^3*14 + 15^2*14 + 15*14 + 14)

AxisMoves.textRepresentationOfMove = function(move) {
    if (AxisMoves.isDiskTurnMove(move)) {
        return (move % 2 === 0 ? "\u2938" : "\u2939") + 'ULDR'.charAt(Math.floor((move % AxisMoves.DISK_TOP_TURN) / 2));
    } else if (AxisMoves.isSerializedState(move)) {
        return 'p';
    } else {
        return '0ULDR#uldr'.charAt(move) || '#';
    }
}

AxisMoves.normalizedMoveDirection = function(move){
    return move % AxisMoves.PARTIAL_MOVES_OFFSET;
}
AxisMoves.isPartialMove = function(move) {
	return move >= AxisMoves.PARTIAL_MOVE_UP && move <= AxisMoves.PARTIAL_MOVE_RIGHT;
}
AxisMoves.createPartialMove = function(move) {
    return move + (move !== AxisMoves.MOVE_UNAFFECTED ? AxisMoves.PARTIAL_MOVES_OFFSET : 0);
}

AxisMoves.turnMoveInfo = function(move) {
    return {
        disk: [AxisDisk.DISK_TOP, AxisDisk.DISK_LEFT, AxisDisk.DISK_BOTTOM, AxisDisk.DISK_RIGHT][ ((move ^ (move & 1)) - AxisMoves.DISK_TOP_TURN)/2 ],
        isCW: (move % 2 === 0)
    }
};
AxisMoves.isDiskTurnMove = function(move) {
    return (AxisMoves.DISK_TOP_TURN <= move) && (move <= AxisMoves.DISK_RIGHT_TURN + 1);
};
AxisMoves.createDiskTurnMove = function(disk, isCW) {
    switch(disk) {
        case AxisDisk.DISK_TOP:     var base = AxisMoves.DISK_TOP_TURN; break;
        case AxisDisk.DISK_LEFT:    var base = AxisMoves.DISK_LEFT_TURN; break;
        case AxisDisk.DISK_BOTTOM:  var base = AxisMoves.DISK_BOTTOM_TURN; break;
        case AxisDisk.DISK_RIGHT:   var base = AxisMoves.DISK_RIGHT_TURN; break;
        default: break;
    }
    return base + (isCW ? 0 : 1);
};

AxisMoves.isSerializedState = function(state) {
    return AxisMoves.SERIALIZED_BASE <= state && state <= AxisMoves.SERIALIZED_MAX;
};
AxisMoves.unserialize = function(state) {
    for (var i = 0, result = []; i < 4; ++i) {
        result.unshift(state % 15);
        state = Math.floor(state / 15);
    }
    return result;
};