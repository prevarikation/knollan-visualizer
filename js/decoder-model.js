'use strict';

import { filterByEndIndices, gateIs, gateIsBetween, sortEndIndicesByCombinationLength } from './axis-states-query.js';

/*
// Boolean setting options:
// - only factory combos
// - force only factory combos
// - assume last move in dragging direction
*/
export class Decoder {
    constructor() {
        Object.defineProperty(this, '_internal', { value: {} });
        this.constructor.dependencies.flat().forEach(basicSetup.bind(this));

        this.clearProgressIncluding([].concat(this.constructor.dependencies[0])[0].name);

        // helpers
        function basicSetup(prop) {
            const basic = {
                enumerable: true,
                get: simpleGet(prop.name),
                set: simpleSet(prop.name)
            };
            let final = Object.assign(basic, prop);
            Object.defineProperty(this, prop.name, final);
        }
        function simpleGet(prop) { return function(){ return this._internal[prop]; }; }
        function simpleSet(prop) { return function(x){ return this._internal[prop] = x; }; }
    }

    set(prop, val) {
        let curVal = this[prop];
        this[prop] = val;
        // TODO: HACK: preventing downstream things from freaking out
        if (val !== curVal) {
            this.clearProgressPast(prop);
        }
    }

    clearProgressIncluding(prop, actuallyPast) {
        var positionInDependencies = this.constructor.dependencies.findIndex(hasTargetProp);
        if (positionInDependencies !== -1) {
            for (var i = positionInDependencies + (actuallyPast ? 1 : 0); i < this.constructor.dependencies.length; ++i) {
                [].concat(this.constructor.dependencies[i]).forEach(s => this[s.name] = null);
            }
        }

        function hasTargetProp(p) { return [].concat(p).find((x) => x.name === prop); }
    }

    clearProgressPast(prop) {
        this.clearProgressIncluding(prop, true);
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

        const fiveRelativeDownMoves = new Array(5).fill(this.constructor.normalizeMove(AxisMoves.MOVE_DOWN, this.firstBindingDisk));
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

        return this.constructor.immediateGlobalPartialMovesActingOnDisk(this.firstBindingDisk, this.firstBindingDiskGatePosition)[0];
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
        // we must compare against null because disk enums include 0 as an acceptable value
        if (this.secondBindingDisk() === null) {
            return null;
        }

        let draggingStartCombo = this.quickSequenceToFirstBindingGate().concat(new Array(this.draggingMoveWithClick-1 || 5).fill(this.constructor.normalizeMove(AxisMoves.MOVE_DOWN, this.firstBindingDisk)));
        let draggingStartState = movesToMHState(draggingStartCombo);
        let draggingEndState = movesToMHState(draggingStartCombo.concat(this.constructor.normalizeMove(AxisMoves.MOVE_DOWN, this.firstBindingDisk)));

        // convert to our 1-15 range for positions
        const secondDiskLowGatePosition = this.constructor.mhIndexToInternalPosition(draggingStartState[diskToMHStateIdx(this.secondBindingDisk())]);
        const secondDiskHighGatePosition = this.constructor.mhIndexToInternalPosition(draggingEndState[diskToMHStateIdx(this.secondBindingDisk())]);
        return { low: (secondDiskLowGatePosition + 1 % 15) || 15, high: secondDiskHighGatePosition };
    }

    secondBindingDiskPossibleCombinations() {
        const secondBindingDiskPossibleGatePositions = this.secondBindingDiskPossibleGatePositions();
        if (!secondBindingDiskPossibleGatePositions) {
            return null;
        }

        let result = {};
        const firstGatePositionFilter = gateIs(filterNameForDisk(this.firstBindingDisk), this.constructor.internalPositionToMHIndex(this.firstBindingDiskGatePosition));
        for (let position of unzipPossibleGatePositions(secondBindingDiskPossibleGatePositions)) {
            let secondGatePositionFilter = gateIs(filterNameForDisk(this.secondBindingDisk()), this.constructor.internalPositionToMHIndex(position));
            // TODO: could use some optimization
            let matchingCombinations = filterByEndIndices(firstGatePositionFilter, secondGatePositionFilter);
            if (matchingCombinations.length) {
                let sortedCombinations = matchingCombinations.sort(sortEndIndicesByCombinationLength).map(o => o.combination.split('').map(shortMoveToMove));
                result[position] = sortedCombinations;
            } else {
                // combination is not possible
                result[position] = null;
            }
        }
        return result;

        function filterNameForDisk(disk) {
            return AxisHumanReadableHelper.diskTo('long')(disk).toLowerCase();
        }
        function unzipPossibleGatePositions(possiblePositions) {
            if (possiblePositions.low > possiblePositions.high) {
                possiblePositions.high += 15;
            }
            return new Array(2*15+1).fill(true).map((x, i) => (i % 15) || 15).slice(possiblePositions.low, possiblePositions.high + 1);
        }
        function shortMoveToMove(c) {
            return { U: AxisMoves.MOVE_UP, L: AxisMoves.MOVE_LEFT, D: AxisMoves.MOVE_DOWN, R: AxisMoves.MOVE_RIGHT }[c];
        }
    }

    howToIsolateSecondGate() {
        const partialMoveSequencesToDirectlyIsolateGate = this.secondBindingDiskPartialMoveSequencesToIsolateGate();
        const partialMoveSequencesToIndirectlyIsolateGate = this.partialMoveSequencesToIsolateGateOnSecondBindingDiskUsingNonBindingDisks();
        if (partialMoveSequencesToDirectlyIsolateGate) {
            return this.constructor.SECOND_GATE_ISOLATION_TECHNIQUE.PARTIAL_MOVES_ON_SECOND_DISK;
        } else if (partialMoveSequencesToIndirectlyIsolateGate) {
            return this.constructor.SECOND_GATE_ISOLATION_TECHNIQUE.INDIRECT_VIA_PARTIAL_MOVES_ON_OTHER_DISK;
        } else {
            return this.constructor.SECOND_GATE_ISOLATION_TECHNIQUE.UNKNOWN;
        }
    }

    secondBindingDiskPartialMoveReverseSteppingDirections() {
        return (this.secondBindingDisk() !== null ? this.constructor.partialMoveReverseSteppingDirections(this.secondBindingDisk()) : null);
    }

    secondBindingDiskPartialMoveSequencesToIsolateGate() {
        if (!this.secondBindingDiskPossibleGatePositions()) {
            return null;
        }
        const startPositionToWorkBackward = this.secondBindingDiskPossibleGatePositions().high + 3;
        const partialMoveSequence = this.constructor.immediateGlobalPartialMovesActingOnDisk(this.secondBindingDisk(), startPositionToWorkBackward);
        // we don't consider this sequence properly isolating if partial moves will disturb the first binding disk
        if (partialMoveSequence.includes(this.partialMoveDisturbingFirstBindingDisk())) {
            return null;
        }

        const quickSequence = this.quickSequenceToFirstBindingGate();
        const draggingOvershoot = new Array(this.draggingMoveWithClick).fill(this.constructor.normalizeMove(AxisMoves.MOVE_DOWN, this.firstBindingDisk));

        const result = [];
        for (let i = 1; i <= 4; ++i) {
            let draggingOvershootSequence = quickSequence.concat(draggingOvershoot, (i === 1 ? this.constructor.normalizeMove(AxisMoves.MOVE_DOWN, this.firstBindingDisk) : []));
            let applicablePartialMoveSequence = partialMoveSequence.slice(0, (i-1) || 3);
            result[i] = draggingOvershootSequence.concat(applicablePartialMoveSequence);
        }
        return result;
    }

    partialMoveSequencesToIsolateGateOnSecondBindingDiskUsingNonBindingDisks() {
        const secondBindingDiskPossibleCombinations = this.secondBindingDiskPossibleCombinations();
        if (!secondBindingDiskPossibleCombinations) {
            return null;
        }

        const result = {};
        for (const [key, val] of Object.entries(secondBindingDiskPossibleCombinations)) {
            if (val) {
                let partialMovesReducingCombinations = val.map(properPartialMovesGivenCombination.bind(this)).filter(x => Object.keys(x).length);
                if (partialMovesReducingCombinations.length) {
                    result[key] = partialMovesReducingCombinations;
                }
            }
        }
        return Object.keys(result).length ? result : null;

        // TODO: whole function makes direct use of DISK_TOP = 0, DISK_LEFT = 1, etc.
        function properPartialMovesGivenCombination(combination) {
            const state = movesToMHState(combination).map(this.constructor.mhIndexToInternalPosition);
            const partialMovesImmediatelyAffectingDisks = state.map((n, i) => this.constructor.immediateGlobalPartialMovesActingOnDisk(i, n));

            const fixedDisks = [this.firstBindingDisk, this.secondBindingDisk()];
            const variableDisks = [AxisDisk.DISK_TOP, AxisDisk.DISK_LEFT, AxisDisk.DISK_BOTTOM, AxisDisk.DISK_RIGHT].filter(disk => !fixedDisks.includes(disk));

            const possibleVariableDiskFirstMoves = new Map(variableDisks.map(disk => [partialMovesImmediatelyAffectingDisks[disk][0], true]));
            fixedDisks.map(disk => partialMovesImmediatelyAffectingDisks[disk][0]).forEach((move) => possibleVariableDiskFirstMoves.delete(move));

            let result = {};
            if (possibleVariableDiskFirstMoves.size == 2) {
                for (let key of possibleVariableDiskFirstMoves.keys()) {
                    // TODO: actually map result[TODO] to the affected disk(s)
                    result[key] = combination.concat(key);
                }
            }

            return result;
        }
    }

    secondBindingDiskGatePosition() {
        const approximatePositions = this.secondBindingDiskPossibleGatePositions();

        let result = null;
        if (this.partialMoveWithResistanceOnNonBindingDisk && this.partialMoveWithResistanceOnNonBindingDisk.positive) {
            result = +this.partialMoveWithResistanceOnNonBindingDisk.positive.split('-')[0];
        } else if (approximatePositions && this.partialMoveWithClickSecondGate) {
            if (approximatePositions.high < approximatePositions.low) {
                approximatePositions.high += 15;
            }
            // BEWARE: off-by-one errors await any attempt to modify this. returned value is in range 1-15.
            result = (((approximatePositions.high + 1 - this.partialMoveWithClickSecondGate) + 15) % 15) || 15;    
        }

        return result;
    }

    // returns combinations in a SPECIFIC format, not the way we've been storing moves here.
    matchingCombinations() {
        let filters = [];

        if (this.quickSequenceToFirstBindingGate()) {
            const firstBindingDiskFilterName = AxisHumanReadableHelper.diskTo('long')(this.firstBindingDisk).toLowerCase();
            let firstGatePosition = this.constructor.internalPositionToMHIndex(this.firstBindingDiskGatePosition);
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
            } else if (this.secondBindingDisk() !== null) {
                const secondBindingDiskFilterName = AxisHumanReadableHelper.diskTo('long')(this.secondBindingDisk()).toLowerCase();
                if (this.secondBindingDiskGatePosition()) {
                    filters.push(gateIs(secondBindingDiskFilterName, this.constructor.internalPositionToMHIndex(this.secondBindingDiskGatePosition())));
                } else if (this.partialMoveWithResistanceOnNonBindingDisk && this.partialMoveWithResistanceOnNonBindingDisk.negative && this.partialMoveWithResistanceOnNonBindingDisk.negative.length) {
                    let impossibleSecondGates = this.partialMoveWithResistanceOnNonBindingDisk.negative.map(s => +s.split('-')[0]);
                    let possibleSecondGates = unzipPossibleGatePositions(this.secondBindingDiskPossibleGatePositions()).filter(x => !impossibleSecondGates.includes(x));
                    let secondGateFilters = possibleSecondGates.map(n => gateIs(secondBindingDiskFilterName, this.constructor.internalPositionToMHIndex(n)));
                    let orFilter = function(st) {
                        for (let filter of secondGateFilters) {
                            if (filter(st)) {
                                return true;
                            }
                        }
                        return false;
                    }
                    filters.push(orFilter);
                } else {
                    const possibleGatePositions = this.secondBindingDiskPossibleGatePositions();
                    filters.push(gateIsBetween(secondBindingDiskFilterName, this.constructor.internalPositionToMHIndex(possibleGatePositions.low), this.constructor.internalPositionToMHIndex(possibleGatePositions.high)));
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

        // TODO: copy-pasted from above
        function unzipPossibleGatePositions(possiblePositions) {
            if (possiblePositions.low > possiblePositions.high) {
                possiblePositions.high += 15;
            }
            return new Array(2*15+1).fill(true).map((x, i) => (i % 15) || 15).slice(possiblePositions.low, possiblePositions.high + 1);
        }
    }
}
Decoder.dependencies = [
    {
        name: 'firstBindingDisk',
        set: function(x) {
            if (typeof x === "string") {
                x = AxisDisk[`DISK_${x.toUpperCase()}`];
            }
            return this._internal.firstBindingDisk = x;
        }
    },
    { name: 'firstBindingDiskGatePosition' },
    { name: 'draggingMoveWithClick' },
    { name: 'modifiedDraggingMoveWithClick' },
    [{name: 'partialMoveWithClickSecondGate'}, {name: 'partialMoveWithResistanceOnNonBindingDisk'}], // if in an array together, they are concurrently cleared
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
Decoder.partialMoveReverseSteppingDirections = function(targetDisk) {
    const lurPattern = [AxisMoves.PARTIAL_MOVE_LEFT, AxisMoves.PARTIAL_MOVE_UP, AxisMoves.PARTIAL_MOVE_RIGHT];
    return lurPattern.map(dir => this.normalizeMove(dir, targetDisk));
};
// "global" refers to this being absolute moves, i.e. not depending on a reference disk
Decoder.immediateGlobalPartialMovesActingOnDisk = function(disk, diskPosition) {
    if (diskPosition > 15) {
        diskPosition %= 15;
    }
    const partialMoveSequence = this.partialMoveReverseSteppingDirections(disk);
    const firstImmediatePartialMoveOnDisk = this.normalizeMove([AxisMoves.PARTIAL_MOVE_LEFT, AxisMoves.PARTIAL_MOVE_RIGHT, AxisMoves.PARTIAL_MOVE_UP][diskPosition % 3], disk);
    const idx = partialMoveSequence.indexOf(firstImmediatePartialMoveOnDisk);
    const adjustedPartialMoveSequence = partialMoveSequence.concat(partialMoveSequence).slice(idx, idx + 3);
    return adjustedPartialMoveSequence;
};
Decoder.SECOND_GATE_ISOLATION_TECHNIQUE = {
    PARTIAL_MOVES_ON_SECOND_DISK: 0,
    INDIRECT_VIA_PARTIAL_MOVES_ON_OTHER_DISK: 1,
    UNKNOWN: 15
};
Decoder.mhIndexToInternalPosition = function(o) {
    const pos = (3*o.N + o.M + 15) % 15;
    return (pos === 0 ? 15 : pos);
};
Decoder.internalPositionToMHIndex = function(n) {
    return { N: Math.floor((n+1)/3) % 5, M: ((n+1) % 3) - 1 };
};

// requires replaying move sequences right now, and some weird dependencies based on original setup
function movesToMHState(moves) {
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
function diskToMHStateIdx(disk) {
    return { [AxisDisk.DISK_TOP]: 0, [AxisDisk.DISK_LEFT]: 1, [AxisDisk.DISK_BOTTOM]: 2, [AxisDisk.DISK_RIGHT]: 3 }[disk];
}

function matchingLockerUnlockerToCombinationsWithState() {
    var filterArguments = arguments;
    var tableWithIndices = lockerUnlockerTable.map(chain => chain.map(function(moveSet, idx){ return { index: idx, moveSet: moveSet }; }));
    var filteredTable = tableWithIndices.map(chain => chain.filter(o => stateMatchesFilters.apply(this, [o.moveSet.state].concat(filterArguments))));
    return filteredTable.map(function(chain, i) {
        var result = null;
        if (chain.length) {
            var result = lockerUnlockerFormatToCombination(lockerUnlockerTable[i], chain.map(o => o.index));
            result.states = chain.map(o => o.moveSet.state);
        }
        return result;
    }).filter(x => x);

    function stateMatchesFilters(state, filters) {
        for (var arg of filters) {
            if (typeof arg === 'function' && !arg({ top: state[0], left: state[1], bottom: state[2], right: state[3] })) {
                return false;
            }
        }
        return true;
    }
}
function lockerUnlockerFormatToCombination(format, desiredIndices) {
    if (desiredIndices) {
        if (desiredIndices.length === 1) {
            // only one pull, so we use the most direct route
            var fullCombo = format[desiredIndices[0]].directCombo || format[desiredIndices[0]].moves;
            desiredIndices = [fullCombo.length-1];
        } else {
            // multiple pulls, but possibly limited or intermittent
            var fullCombo = format.filter((x,i) => (i <= Math.max.apply(null, desiredIndices))).map(o => o.moves).join('');
            desiredIndices = desiredIndices.map(x => x + format[0].moves.length-1);
        }
    } else {
        // no info given = pull at the end of every move sequence
        var fullCombo = format.map(o => o.moves).join('');
        desiredIndices = new Array(format.length).fill(true).map((x,i) => i + format[0].moves.length-1);
    }

    return { combo: fullCombo, indicesForMultiplePulls: desiredIndices };
}

export function formatMoveSequence(moves) {
    return moves.reduce(function(a,b){ return (!a.length || a[a.length-1] === b ? a + b : a + ' ' + b); }, '');
}