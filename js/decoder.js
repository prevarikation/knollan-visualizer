'use strict';
/* This code is really bad. How *not* to write front-end JS: mix UI
** and logic code, spooky action at a distance. <3 prevarikate. */
var states = new AxisStates();

function filterByEndIndices() {
    var st = { top: {}, left: {}, bottom: {}, right: {} };
    var found = [];
    for (var i in AxisStates.CombinationTable) {
        AxisStates.StateNumber2State(i, st.top, st.left, st.bottom, st.right);
        var matches = true;
        for (var arg of arguments) {
            if (typeof arg === 'function' && !arg(st)) {
                matches = false;
            }
        }
        if (matches) {
            var individualState = { top: Object.assign({}, st.top), left: Object.assign({}, st.left), bottom: Object.assign({}, st.bottom), right: Object.assign({}, st.right) };
            found.push({
                i: i,
                state: individualState,
                combination: AxisStates.CombinationTable[i]
            });
        }
    }
    return found;
}

var possibilities = filterByEndIndices(
    gateIs('top', { N: 3, M: -1 }),
    gateIsBetween('left', {N: 1, M: 1}, {N: 3, M:1}),
    gateIsBetween('bottom', {N: 1, M: 0}, {N: 3, M:0}),
    gateIsBetween('right', {N: 2, M: -1}, {N: 4, M: -1})
);
possibilities.sort(sortEndIndicesByCombinationLength);

// all ranges are boundary-inclusive.
function gateIsBetween(which, first, second) {
    var lower = indexPairToInteger(first);
    var upper = indexPairToInteger(second);
    return function(st) {
        var value = indexPairToInteger(st[which]);
        // if lower is greater than upper, we invert criteria, for wraparound.
        return (lower <= upper ? (value >= lower && value <= upper) : (value <= lower || value >= upper));
    };
}

function gateIs(which, exact) {
    return gateIsBetween(which, exact, exact);
}

function indexPairToInteger(indexPair) {
    return 3*indexPair.N + indexPair.M;
}

function sortEndIndicesByCombinationLength(a, b) { return a.combination.length - b.combination.length; }

function relatedByDownMoves(stateA, stateB) {
    if (stateA.top.N !== stateB.top.N || stateA.top.M !== stateB.top.M) {
        return false;
    } else if (bottomDisksHash(stateA) !== bottomDisksHash(stateB)) {
        return false;
    }

    for (var dir of ["left", "bottom", "right"]) {
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
    var newState = { top: Object.assign({}, state.top) };
    newState.left   = { M: 1,  N: (state.left.N +     (state.left.M < 1 ? 0 : 1)) % 5 };
    newState.bottom = { M: 0,  N: (state.bottom.N + (state.bottom.M < 0 ? 0 : 1)) % 5 };
    newState.right  = { M: -1, N: (state.right.N + 1) % 5 };
    return newState;
}

function calculate() {
    if (typeof states === 'undefined') {
        states = new AxisStates();
    }

    var lru = parseInt(document.getElementById('lru').value, 10);
    if (lru >= 0 && lru <= 15) {
        lru = (lru % 15) + 1;
        var topDiskLocation = { n: Math.floor(lru/3) % 5, m: (lru % 3) - 1 };
        document.getElementById('lru-gate-location').value = "[" + topDiskLocation.n + ", " + topDiskLocation.m + "]";

        var matchingCombinations = filterByEndIndices(gateIs('top', { N: topDiskLocation.n, M: topDiskLocation.m }));
        document.getElementById('combinations').value = matchingCombinations.length;
    } else {
        //error
    }
}

function selectRightDiskGate(e) {
    if (document.forms['diskGateSelectors'].elements['rightGatePosition'].value === -1) {
        return;
    } else {
        var rightGateElements = document.forms['diskGateSelectors'].elements['rightGatePosition'];
        var val = rightGateElements.value;
        var rightGate = parsePositionText(Array.from(rightGateElements).filter(el => el.value === val)[0].nextElementSibling.innerText);
    }

    var topGate = {
        N: Math.floor((Number(document.forms['diskGateSelectors'].elements['topGatePosition'].value) + 1) / 3) % 5,
        M: ((document.forms['diskGateSelectors'].elements['topGatePosition'].value + 1) % 3) - 1
    };

    var possibilities = filterByEndIndices(
        gateIs('top', topGate),
        gateIs('right', rightGate)
    );
    possibilities.sort(sortEndIndicesByCombinationLength);

    if (document.forms['diskGateSelectors'].onlyFactoryCodes.checked) {
        possibilities = possibilities.filter(o => o.combination.length === 4);
    }

    if (possibilities.length) {
        document.getElementById("combinations").innerHTML =
            "<select size='" + possibilities.length + "'>" +
            possibilities.map(o => "<option>0 " + separateConsecutiveDistinct(o.combination) + "</option>").join("") +
            "</select>";
        document.getElementById("totalCombinations").innerText = "(" + possibilities.length + ")";
    } else {
        document.getElementById("combinations").innerText = "No combinations found. Maybe try adjacent values for right wheel?";
        document.getElementById("totalCombinations").innerText = "";
    }
}

function selectUpperDiskGate() {
    var gate = document.forms['diskGateSelectors'].elements['topGatePosition'].value;
    if (!gate.length) {
        document.getElementById('top-gate-sequence').innerHTML = '&nbsp;';
    } else {
        gate = parseInt(gate, 10);
        var totalUpMoves = Math.floor(gate / 3);
        var hasLeftMove  = ((gate % 3) >= 1);
        var hasRightMove = ((gate % 3) >= 2);
        document.getElementById('top-gate-sequence').innerText = [
            "0",
            (totalUpMoves > 0 ? new Array(totalUpMoves).fill("U").join("") : ""),
            (hasRightMove ? "R" : (hasLeftMove ? "L" : "")),
            "DDDDD"
        ].filter(s => s.length).join(" ");

        var rightWheelPosition = {
            N: totalUpMoves - 1 + Number(hasRightMove),
            M: Number(!hasRightMove)
        };
        document.getElementById('right-wheel-position').innerText = "(" + rightWheelPosition.N.toString() + "," + rightWheelPosition.M.toString() + ")";

        document.getElementById('right-gate-select').classList.remove('not-enough-information');
        var rightGateDOMEls = document.forms['diskGateSelectors'].elements['rightGatePosition'];
        for (var i = 0; i < rightGateDOMEls.length; ++i) {
            var positionN = ((rightWheelPosition.N + Math.floor(rightGateDOMEls[i].value/3)) % 5);
            var positionM = ((rightGateDOMEls[i].value % 3) - 1);

            /* top gate removes some possibilies, based on constraints from the last move.
            ** we're able to use "has right move" or "has left move" as shortcuts for the logic. */
            rightGateDOMEls[i].disabled = (hasRightMove && positionM === 1 || !hasLeftMove && !hasRightMove && positionM === 0);

            switch(rightGateDOMEls[i].value) {
                case "-1": break;
                case "0":
                    rightGateDOMEls[i].nextElementSibling.innerText = rightWheelPosition.N + "," + rightWheelPosition.M;
                    break;
                case "1":
                    if (rightWheelPosition.M >= 0) {
                        rightGateDOMEls[i].disabled = true;
                        rightGateDOMEls[i].nextElementSibling.innerHTML = "&nbsp;";
                    } else {
                        rightGateDOMEls[i].nextElementSibling.innerText = rightWheelPosition.N + ",0";
                    }
                    break;
                case "2":
                    if (rightWheelPosition.M >= 1) {
                        rightGateDOMEls[i].disabled = true;
                        rightGateDOMEls[i].nextElementSibling.innerHTML = "&nbsp;";
                    } else {
                        rightGateDOMEls[i].nextElementSibling.innerText = rightWheelPosition.N + ",1";
                    }
                    break;
                default:
                    rightGateDOMEls[i].nextElementSibling.innerText = positionN + "," + positionM;
                    break;
            }
        }
        document.forms['diskGateSelectors'].elements['rightGatePosition'].value = -1;

            document.getElementById("combinations").innerHTML = "will appear here";
        document.getElementById("totalCombinations").innerText = "";
    }
}

function parsePositionText(str) {
    var matches = str.match(/([0-4]),([-]?[0|1])/);
    if (matches) {
        // don't need to worry about -0 because -0 === 0
        return { N: Number(matches[1]), M: Number(matches[2]) };
    } else {
        return matches;
    }
}

function separateConsecutiveDistinct(str) {
    if (!str.length) {
        return str;
    }

    var current = str[0];
    for (var i = 1, result = current; i < str.length; ++i) {
        if (str[i] === current) {
            result += current;
        } else {
            result += " " + str[i];
            current = str[i];
        }
    }
    return result;
}

window.addEventListener('DOMContentLoaded', function(){
    return;
    //document.getElementById('calculate').addEventListener('click', calculate);
    for (var radio of document.forms['diskGateSelectors'].elements['topGatePosition']) {
        radio.addEventListener('change', selectUpperDiskGate);
    }
    for (var radio of document.forms['diskGateSelectors'].elements['rightGatePosition']) {
        radio.disabled = true;
        radio.addEventListener('change', selectRightDiskGate);
    }
    document.forms['diskGateSelectors'].onlyFactoryCodes.addEventListener('change', selectRightDiskGate);
});