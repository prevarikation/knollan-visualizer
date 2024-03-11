'use strict';

// populate the state table
AxisStates();

/*** example:
let possibilities = filterByEndIndices(
    gateIs('top', { N: 3, M: -1 }),
    gateIsBetween('left', {N: 1, M: 1}, {N: 3, M:1}),
    gateIsBetween('bottom', {N: 1, M: 0}, {N: 3, M:0}),
    gateIsBetween('right', {N: 2, M: -1}, {N: 4, M: -1})
);
possibilities.sort(sortEndIndicesByCombinationLength);
****/
export function filterByEndIndices(...filters) {
    // HACK: you can operate on a previously filtered array by passing it as the first argument
    if (filters.length && Array.isArray(filters[0])) {
        let subset = filters.shift();
        return subset.filter(entry => matchesPassedFilters(entry.state));
    } else {
        let st = { top: {}, left: {}, bottom: {}, right: {} };
        let found = [];
        for (let i in AxisStates.CombinationTable) {
            AxisStates.StateNumber2State(i, st.top, st.left, st.bottom, st.right);
            if (matchesPassedFilters(st)) {
                const individualState = { top: Object.assign({}, st.top), left: Object.assign({}, st.left), bottom: Object.assign({}, st.bottom), right: Object.assign({}, st.right) };
                found.push({
                    i: i,
                    state: individualState,
                    combination: AxisStates.CombinationTable[i]
                });
            }
        }
        return found;
    }

    function matchesPassedFilters(state) {
        let matches = true;
        for (const filter of filters) {
            if (typeof filter === 'function' && !filter(state)) {
                matches = false;
            }
        }
        return matches;
    }
}

// all ranges are boundary-inclusive.
// as far as directionality: this counts values between first ------> second, not second ------> first
export function gateIsBetween(which, first, second) {
    const lower = indexPairToInteger(first);
    const upper = indexPairToInteger(second);
    return function(st) {
        const value = indexPairToInteger(st[which]);
        // if lower is greater than upper, we need to wrap around.
        return (lower <= upper ? (value >= lower && value <= upper) : (value >= lower || value <= upper));
    };
}

export function gateIs(which, exact) {
    return gateIsBetween(which, exact, exact);
}

export function sortEndIndicesByCombinationLength(a, b) { return a.combination.length - b.combination.length; }

function indexPairToInteger(indexPair) {
    return 3*indexPair.N + indexPair.M;
}

/*** BELOW THIS LINE IS KEPT FOR REFERENCE - UNUSED ***/

function relatedByDownMoves(stateA, stateB) {
    if (stateA.top.N !== stateB.top.N || stateA.top.M !== stateB.top.M) {
        return false;
    } else if (bottomDisksHash(stateA) !== bottomDisksHash(stateB)) {
        return false;
    }

    for (let dir of ["left", "bottom", "right"]) {
        if (stateA[dir].M !== stateB[dir].M) {
            //return false;`
        }
    }
    return true;

    function moveDown(st) {
        return 5*((st.left.N - st.bottom.N + 5) % 5) + ((st.bottom.N - st.right.N + 5) % 5);
    }
}

function moveDown(state) {
    let newState = { top: Object.assign({}, state.top) };
    newState.left   = { M: 1,  N: (state.left.N +     (state.left.M < 1 ? 0 : 1)) % 5 };
    newState.bottom = { M: 0,  N: (state.bottom.N + (state.bottom.M < 0 ? 0 : 1)) % 5 };
    newState.right  = { M: -1, N: (state.right.N + 1) % 5 };
    return newState;
}

function separateConsecutiveDistinct(str) {
    if (!str.length) {
        return str;
    }

    let current = str[0];
    for (let i = 1, result = current; i < str.length; ++i) {
        if (str[i] === current) {
            result += current;
        } else {
            result += " " + str[i];
            current = str[i];
        }
    }
    return result;
}