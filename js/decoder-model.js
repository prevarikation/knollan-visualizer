'use strict';
//factory codes only
//assume last move in dragging direction

//first binding disk
//first binding disk gate position
//// quick sequence
//// dragging sequences
//dragging move with click
//modified dragging move with click
//second binding disk
class Decoder {
    constructor() {
        this.firstBindingDiskGatePosition = null;
    }

    set(prop, val) {
        this[prop] = val;
        this.clearProgressPast(prop);
    }

    clearProgressIncluding(prop) {
        var positionInDependencies = Decoder.dependencies.indexOf(prop);
        if (positionInDependencies !== -1) {
            for (var i = positionInDependencies; i < Decoder.dependencies.length; ++i) {
                this[Decoder.dependencies[i]] = undefined;
            }
        }
    }

    clearProgressPast(prop) {
        var positionInDependencies = Decoder.dependencies.indexOf(prop);
        if (positionInDependencies !== -1) {
            for (var i = positionInDependencies + 1; i < Decoder.dependencies.length; ++i) {
                this[Decoder.dependencies[i]] = undefined;
            }
        }
    }

    clearAllProgress() {
        this.clearProgressIncluding('firstBindingDisk');
    }

    moveOppositeFirstBindingDisk() {
        return this.constructor.normalizeMove(AxisMoves.MOVE_DOWN, this.firstBindingDisk);
    }

    quickSequenceToFirstBindingGate() {
        if (typeof this.firstBindingDiskGatePosition !== "number" || this.firstBindingDiskGatePosition < 1 || this.firstBindingDiskGatePosition > 15) {
            return null;
        }

        let totalUpMoves = Math.floor(this.firstBindingDiskGatePosition / 3);
        if (totalUpMoves === 0) {
            totalUpMoves = 5;
        }
        let hasLeftMove  = ((this.firstBindingDiskGatePosition % 3) >= 1);
        let hasRightMove = ((this.firstBindingDiskGatePosition % 3) >= 2);
    
        let quickSequence = new Array(totalUpMoves).fill(this.constructor.normalizeMove(AxisMoves.MOVE_UP, this.firstBindingDisk));
        if (hasLeftMove || hasRightMove) {
            quickSequence.push(this.constructor.normalizeMove((hasRightMove ? AxisMoves.MOVE_RIGHT : AxisMoves.MOVE_LEFT), this.firstBindingDisk));
        }
        return quickSequence;
    }

    adjustedQuickSequenceToFirstBindingGate() {
        const quickSequence = this.quickSequenceToFirstBindingGate();
        if (!quickSequence) {
            return null;
        }
        return [AxisMoves.MOVE_RIGHT, AxisMoves.MOVE_DOWN].map(move => this.constructor.normalizeMove(move, this.firstBindingDisk)).concat(quickSequence);
    }

    adjustedQuickSequencesWithPossibleClickOnDrag() {
        const adjustedQuickSequence = this.adjustedQuickSequenceToFirstBindingGate();
        if (!adjustedQuickSequence || !this.draggingMoveWithClick) {
            return null;
        }

        const fiveRelativeDownMoves = new Array(5).fill(Decoder.normalizeMove(AxisMoves.MOVE_DOWN, this.firstBindingDisk));
        const result = [];
        for (let i = 1; i <= 5; ++i) {
            // performing [R D] [quick seq] advances the right wheel by 2, and the bottom wheel by 1, so we need to show sequences that are effectively 0, -1 and -2.
            const possibleClickOnDrag = (((i - this.draggingMoveWithClick - 5) % 5) >= -2);
            if (possibleClickOnDrag) {
                result[i] = adjustedQuickSequence.concat(fiveRelativeDownMoves.slice(0, (i-1) || 5));
            }
        }

        return result;
    }

    partialMoveDisturbingFirstBindingDisk() {
        if (!this.quickSequenceToFirstBindingGate()) {
            return null;
        }

        return this.constructor.normalizeMove([AxisMoves.PARTIAL_MOVE_LEFT, AxisMoves.PARTIAL_MOVE_RIGHT, AxisMoves.PARTIAL_MOVE_UP][this.firstBindingDiskGatePosition % 3], this.firstBindingDisk);
    }

    // note that this is computed instead of being directly assigned
    secondBindingDisk() {
        if (!this.draggingMoveWithClick || !this.modifiedDraggingMoveWithClick) {
            return null;
        }

        let secondBindingDisk;
        switch((this.draggingMoveWithClick - this.modifiedDraggingMoveWithClick + 5) % 5) {
            case 0: secondBindingDisk = AxisDisk.DISK_LEFT; break;
            case 1: secondBindingDisk = AxisDisk.DISK_BOTTOM; break;
            case 2: secondBindingDisk = AxisDisk.DISK_RIGHT; break;
        }
        return this.constructor.normalizeDisk(secondBindingDisk, this.firstBindingDisk);
    }

    secondBindingDiskPossibleGatePositions() {
        if (!this.secondBindingDisk()) {
            return null;
        }

        let draggingStartCombo = this.quickSequenceToFirstBindingGate().concat(new Array(this.draggingMoveWithClick-1 || 5).fill(this.constructor.normalizeMove(AxisMoves.MOVE_DOWN, this.firstBindingDisk)));
        let draggingStartState = movesToState(draggingStartCombo);
        let draggingEndState = movesToState(draggingStartCombo.concat(this.constructor.normalizeMove(AxisMoves.MOVE_DOWN, this.firstBindingDisk)));

        // convert to our 1-15 range for positions
        const secondDiskLowGatePosition = axisIndexToInternalPosition(draggingStartState[diskToStateIdx(this.secondBindingDisk())]);
        const secondDiskHighGatePosition = axisIndexToInternalPosition(draggingEndState[diskToStateIdx(this.secondBindingDisk())]);
        return { low: secondDiskLowGatePosition, high: secondDiskHighGatePosition };

        // requires replaying move sequences right now, and some weird dependencies based on original setup
        function movesToState(moves) {
            var dummyCanvas = document.createElement('canvas');
            var dummyImage = document.createElement('img');
            var disks = [
                new AxisDisk(dummyCanvas, dummyImage, 0, AxisDisk.DISK_TOP),
                new AxisDisk(dummyCanvas, dummyImage, 90, AxisDisk.DISK_LEFT),
                new AxisDisk(dummyCanvas, dummyImage, 180, AxisDisk.DISK_BOTTOM),
                new AxisDisk(dummyCanvas, dummyImage, 270, AxisDisk.DISK_RIGHT)
            ]
            for (var move of moves) {
                for (var disk of disks) {
                    disk.move(move);
                }
            }
            return disks.map(disk => disk.index);
        }

        function axisIndexToInternalPosition(o) {
            return ((3*o.N + o.M + 15) % 15) + 1;
        }
        function diskToStateIdx(disk) {
            return { [AxisDisk.DISK_TOP]: 0, [AxisDisk.DISK_LEFT]: 1, [AxisDisk.DISK_BOTTOM]: 2, [AxisDisk.DISK_RIGHT]: 3 }[disk];
        }
    }

    howToIsolateSecondGate() {
        // TODO: describe the path forward
        const partialMovesCanBeIsolated = !this.secondBindingDiskPartialMoveReverseSteppingDirections().includes(this.partialMoveDisturbingFirstBindingDisk());
        if (partialMovesCanBeIsolated) {
            return Decoder.SECOND_GATE_ISOLATION_TECHNIQUE.PARTIAL_MOVES_ON_SECOND_DISK;
        } else if (false) { // TODO
            return Decoder.SECOND_GATE_ISOLATION_TECHNIQUE.INDIRECT_VIA_PARTIAL_MOVES_ON_OTHER_DISK;
        } else {
            return Decoder.SECOND_GATE_ISOLATION_TECHNIQUE.UNKNOWN;
        }
    }

    secondBindingDiskPartialMoveReverseSteppingDirections() {
        return (this.secondBindingDisk() ? this.constructor.reverseSteppingDirections(this.secondBindingDisk()).map(AxisMoves.createPartialMove) : null);
    }

    // there's no guarantee these sequences are universally applicable -- sometimes partial moves will disturb the first disk. check beforehand.
    secondBindingDiskPartialMoveSequencesToIsolateGate() {
        if (!this.secondBindingDiskPossibleGatePositions()) {
            return null;
        }

        const partialMoveSequence = this.secondBindingDiskPartialMoveReverseSteppingDirections();
        const quickSequence = this.quickSequenceToFirstBindingGate();
        const draggingOvershoot = new Array(this.draggingMoveWithClick).fill(this.constructor.normalizeMove(AxisMoves.MOVE_DOWN, this.firstBindingDisk));
        const draggingOvershootSequence = quickSequence.concat(draggingOvershoot);

        const result = [];
        for (let i = 1; i <= 4; ++i) {
            result[i] = draggingOvershootSequence.concat(partialMoveSequence.concat(partialMoveSequence).slice(0, i));
        }
        return result;
    }

    secondBindingDiskGatePosition() {
        const approximatePositions = this.secondBindingDiskPossibleGatePositions();
        if (!approximatePositions || !this.partialMoveWithClickSecondGate) {
            return null;
        }

        if (approximatePositions.high < approximatePositions.low) {
            approximatePositions.high += 15;
        }
        // BEWARE: off-by-one errors await any attempt to modify this. returned value is in range 1-15.
        return (approximatePositions.high - 1 - this.partialMoveWithClickSecondGate + 15) % 15 + 1;
    }

    // returns combinations in a SPECIFIC format, not the way we've been storing moves here.
    // TODO: inaccuracies, maybe based off second gate positions etc.?
    matchingCombinations() {
        let filters = [];

        if (this.quickSequenceToFirstBindingGate()) {
            const firstBindingDiskFilterName = AxisHumanReadableHelper.diskTo('long')(this.firstBindingDisk).toLowerCase();
            let firstGatePosition = internalPositionToAxisIndex(this.firstBindingDiskGatePosition);
            filters.push(gateIs(firstBindingDiskFilterName, firstGatePosition));

            // note that this will ignore later data if we're forcing last move in the dragging direction
            if (this.assumeLastMoveInDraggingDirection) {
                var oppositeBindingDiskMap = {
                    top: ['right', 'bottom', 'left'],
                    left: ['top', 'right', 'bottom'],
                    bottom: ['left', 'top', 'right'],
                    right: ['bottom', 'left', 'top']
                };
                filters.push(function(st){
                    return st[oppositeBindingDiskMap[firstBindingDiskFilterName][0]].M === -1 && st[oppositeBindingDiskMap[firstBindingDiskFilterName][1]].M === 0 && st[oppositeBindingDiskMap[firstBindingDiskFilterName][2]].M === 1;
                });
            } else if (this.secondBindingDisk()) {
                const secondBindingDiskFilterName = AxisHumanReadableHelper.diskTo('long')(this.secondBindingDisk()).toLowerCase();
                if (this.secondBindingDiskGatePosition()) {
                    filters.push(gateIs(secondBindingDiskFilterName, internalPositionToAxisIndex(this.secondBindingDiskGatePosition())));
                } else {
                    const possibleGatePositions = this.secondBindingDiskPossibleGatePositions();
                    filters.push(gateIsBetween(secondBindingDiskFilterName, internalPositionToAxisIndex(possibleGatePositions.low), internalPositionToAxisIndex(possibleGatePositions.high)));
                }
            }
        }

        // always lead with locker unlocker combinations
        let matchingCombinations = matchingLockerUnlockerToCombinationsWithState.apply(null, filters);

        if (!this.onlyFactoryCombos && !this.forceOnlyFactoryCombos) {
            // add filter to not repeat states already visited by locker unlocker combos
            let visitedStates = {};
            for (let state of matchingCombinations.map(o => o.states).flat().map(st => AxisStates.State2StateNumber.apply(null, st))) {
                visitedStates[state] = true;
            }
            filters.push(function(st){
                return typeof visitedStates[AxisStates.State2StateNumber(st.top, st.left, st.bottom, st.right)] === 'undefined';
            });

            var additionalCombinations = filterByEndIndices.apply(null, filters).sort(sortEndIndicesByCombinationLength).map(function(c){ return { combo: c.combination }; });
            matchingCombinations = matchingCombinations.concat(additionalCombinations);
        }

        return matchingCombinations;

        function internalPositionToAxisIndex(n) {
            return { N: Math.floor((n+1)/3) % 5, M: ((n+1) % 3) - 1 };
        }
    }
}
Decoder.dependencies = [
    'firstBindingDisk',
    'firstBindingDiskGatePosition',
    'draggingMoveWithClick',
    'modifiedDraggingMoveWithClick',
    'partialMoveWithClickSecondGate'
];
Decoder.normalizeMove = function(unnormalizedMove, relativeTopDisk) {
    const isPartial = AxisMoves.isPartialMove(unnormalizedMove);
    const normalizedMove = {
        [AxisDisk.DISK_TOP]: { [AxisMoves.MOVE_UP]: AxisMoves.MOVE_UP, [AxisMoves.MOVE_LEFT]: AxisMoves.MOVE_LEFT, [AxisMoves.MOVE_DOWN]: AxisMoves.MOVE_DOWN, [AxisMoves.MOVE_RIGHT]: AxisMoves.MOVE_RIGHT },
        [AxisDisk.DISK_LEFT]: { [AxisMoves.MOVE_UP]: AxisMoves.MOVE_LEFT, [AxisMoves.MOVE_LEFT]: AxisMoves.MOVE_DOWN, [AxisMoves.MOVE_DOWN]: AxisMoves.MOVE_RIGHT, [AxisMoves.MOVE_RIGHT]: AxisMoves.MOVE_UP },
        [AxisDisk.DISK_BOTTOM]: { [AxisMoves.MOVE_UP]: AxisMoves.MOVE_DOWN, [AxisMoves.MOVE_LEFT]: AxisMoves.MOVE_RIGHT, [AxisMoves.MOVE_DOWN]: AxisMoves.MOVE_UP, [AxisMoves.MOVE_RIGHT]: AxisMoves.MOVE_LEFT },
        [AxisDisk.DISK_RIGHT]: { [AxisMoves.MOVE_UP]: AxisMoves.MOVE_RIGHT, [AxisMoves.MOVE_LEFT]: AxisMoves.MOVE_UP, [AxisMoves.MOVE_DOWN]: AxisMoves.MOVE_LEFT, [AxisMoves.MOVE_RIGHT]: AxisMoves.MOVE_DOWN },
    }[relativeTopDisk][AxisMoves.normalizedMoveDirection(unnormalizedMove)];
    return (isPartial ? AxisMoves.createPartialMove(normalizedMove) : normalizedMove);
};
Decoder.normalizeDisk = function(unnormalizedDisk, relativeTopDisk) {
    return {
        [AxisDisk.DISK_TOP]: { [AxisDisk.DISK_TOP]: AxisDisk.DISK_TOP, [AxisDisk.DISK_LEFT]: AxisDisk.DISK_LEFT, [AxisDisk.DISK_BOTTOM]: AxisDisk.DISK_BOTTOM, [AxisDisk.DISK_RIGHT]: AxisDisk.DISK_RIGHT },
        [AxisDisk.DISK_LEFT]: { [AxisDisk.DISK_TOP]: AxisDisk.DISK_LEFT, [AxisDisk.DISK_LEFT]: AxisDisk.DISK_BOTTOM, [AxisDisk.DISK_BOTTOM]: AxisDisk.DISK_RIGHT, [AxisDisk.DISK_RIGHT]: AxisDisk.DISK_TOP },
        [AxisDisk.DISK_BOTTOM]: { [AxisDisk.DISK_TOP]: AxisDisk.DISK_BOTTOM, [AxisDisk.DISK_LEFT]: AxisDisk.DISK_RIGHT, [AxisDisk.DISK_BOTTOM]: AxisDisk.DISK_TOP, [AxisDisk.DISK_RIGHT]: AxisDisk.DISK_LEFT },
        [AxisDisk.DISK_RIGHT]: { [AxisDisk.DISK_TOP]: AxisDisk.DISK_RIGHT, [AxisDisk.DISK_LEFT]: AxisDisk.DISK_TOP, [AxisDisk.DISK_BOTTOM]: AxisDisk.DISK_LEFT, [AxisDisk.DISK_RIGHT]: AxisDisk.DISK_BOTTOM },
    }[relativeTopDisk][unnormalizedDisk];
};
Decoder.steppingDirections = function(targetDisk) {
    const lruPattern = [AxisMoves.MOVE_LEFT, AxisMoves.MOVE_RIGHT, AxisMoves.MOVE_UP];
    return lruPattern.map(dir => this.normalizeMove(dir, targetDisk));
};
Decoder.reverseSteppingDirections = function(targetDisk) {
    return this.steppingDirections(targetDisk).toReversed();
};
Decoder.SECOND_GATE_ISOLATION_TECHNIQUE = {
    PARTIAL_MOVES_ON_SECOND_DISK: 0,
    INDIRECT_VIA_PARTIAL_MOVES_ON_OTHER_DISK: 1,
    UNKNOWN: 15
};

function formatMoveSequence(moves) {
    return moves.reduce(function(a,b){ return (!a.length || a[a.length-1] === b ? a + b : a + ' ' + b); }, '');
}