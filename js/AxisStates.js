/*
MIT License

Copyright (c) 2008-2021 Michael Huebler

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/* Modified for HTML5 <canvas> by prevarikation, March 2021. */

// TODO: clean up, make class
function AxisStates() {
    var pos = 0;
    for (var i = 0; i < StateTable.table.length; ++i) {
        pos += AxisStates.distanceCodingTable[StateTable.table[i] % 16];
        var temp = Math.floor(StateTable.table[i] / 16);
        var len = temp % 16;
        temp = Math.floor(temp / 16);
        AxisStates.CombinationTable[pos] = "";
        for (var j = 0; j < len; j++)
        {
            AxisStates.CombinationTable[pos] += AxisStates.movementCodingTable[temp % 4];
            temp = Math.floor(temp / 4);
        }
    }
    AxisStates.CombinationTable[3616] = AxisStates.RESET_STATE_TEXT;
}
AxisStates.RESET_STATE_TEXT = "<Reset>";
AxisStates.INVALID_STATE_TEXT = "<invalid state>";
AxisStates.CombinationTable = [];
AxisStates.movementCodingTable = ["U", "L", "D", "R"];
AxisStates.distanceCodingTable = [1, 3, 4, 17, 31, 33, 46, 49, 62, 227, 257];

AxisStates.State2StateNumber = function(TopIndex, LeftIndex, BottomIndex, RightIndex) {
    return  (TopIndex.N * 3 + TopIndex.M + 1) * (15 * 15 * 15) +
            (LeftIndex.N * 3 + LeftIndex.M + 1) * (15 * 15) + 
            (RightIndex.N * 3 + RightIndex.M + 1) * (15) + 
            (BottomIndex.N * 3 + BottomIndex.M + 1);
}
AxisStates.StateNumber2State = function(StateNumber, TopIndex, LeftIndex, BottomIndex, RightIndex) {
    var Bottom = StateNumber % 15;
    var Right = Math.floor(StateNumber / 15) % 15;
    var Left = Math.floor(StateNumber / (15 * 15)) % 15;
    var Top = Math.floor(StateNumber / (15 *15 * 15)) % 15;

    BottomIndex.M = (Bottom % 3) - 1;
    RightIndex.M = (Right % 3) - 1;
    LeftIndex.M = (Left % 3) - 1;
    TopIndex.M = (Top % 3) - 1;

    BottomIndex.N = Math.floor(Bottom / 3);
    RightIndex.N = Math.floor(Right / 3);
    LeftIndex.N = Math.floor(Left / 3);
    TopIndex.N = Math.floor(Top / 3);
}

AxisStates.GetCombination = function(StateNumber) {
    if (AxisStates.CombinationTable[StateNumber] == undefined) {
        return AxisStates.INVALID_STATE_TEXT;
    } else {
        return AxisStates.CombinationTable[StateNumber];
    }
}
AxisStates.GetNicerCombinationFormat = function(Combination) {
    var NicerCombinationFormat;
    var LastMovement;
    var i;
    var count;

    //Combination = "UDLRUDLRUDLRUDLRUDLRUDLRR"

    NicerCombinationFormat = "";
    if ((Combination == AxisStates.INVALID_STATE_TEXT) || (Combination == AxisStates.RESET_STATE_TEXT)){
        return "";
    } else {
        LastMovement = Combination.charAt (0);
        count = 0;
        for (i = 0; i < Combination.length; i++) {
            //trace ("NCF: "+NicerCombinationFormat)
            if ((Combination.charAt (i) == LastMovement) || (i == 0)) {
                count++;
            } else {
                NicerCombinationFormat = NicerCombinationFormat + LastMovement;
                if (count > 1) {
                    NicerCombinationFormat = NicerCombinationFormat + "*" + count;
                }
                NicerCombinationFormat = NicerCombinationFormat + "  ";
                LastMovement = Combination.charAt (i);
                count = 1;
            }
        }
        NicerCombinationFormat = "(" + NicerCombinationFormat + LastMovement;			
        if (count > 1) {
            NicerCombinationFormat = NicerCombinationFormat + "*" + count;
        }
        NicerCombinationFormat = NicerCombinationFormat + ")";
        return NicerCombinationFormat;
    }
}
AxisStates.GetNicerCombinationFormat2 = function(Combination) {
    if ((Combination == AxisStates.INVALID_STATE_TEXT) || (Combination == AxisStates.RESET_STATE_TEXT)){
        return Combination;
    } else {
        return AxisStates.GetRawMoveFormat(Combination);
    }
}
AxisStates.GetRawMoveFormat = function(Combination) {
    return Combination.split('').reduce(spaceDifferingMoves, '');

    function spaceDifferingMoves(prev, cur) {
        if (!prev.length) {
            return cur;
        } else {
            // allow upper range unicode characters prefix ASCII-coded moves
            return prev + (prev[prev.length-1] !== cur && prev.charCodeAt(prev.length-1) <= 255  ? ' ' : '') + cur;
        }
    }
}

AxisStates.GetAntedecedentStates = function(state) {
    var combination = AxisStates.GetCombination(AxisStates.State2StateNumber.apply(null, state));
    if (combination !== AxisStates.INVALID_STATE_TEXT && combination !== AxisStates.RESET_STATE_TEXT) {
        // Find last move direction.
        // state is stored as TLBR, so we need to iterate around the other direction
        // guaranteed to find something since we already checked that we're in a valid combination state.
        for (var i = 2*state.length-1; i > state.length; --i) {
            if (state[i % state.length].M !== -1) {
                continue;
            }
            if (state[(i-1) % state.length].M !== 0) {
                continue;
            }
            if (state[(i-2) % state.length].M !== 1) {
                continue;
            }
            break;
        }
        // matches up with AxisMoves, except for the right move.
        var lastMove = i % state.length;
        if (lastMove === 0) {
            lastMove = AxisMoves.MOVE_RIGHT;
        }

        // Find second to last distinct move direction.
        var secondToLastMove = null;
        if (lastMove === AxisMoves.MOVE_UP) {
            switch(state[AxisDisk.DISK_BOTTOM].M) {
                case -1:	secondToLastMove = AxisMoves.MOVE_LEFT; break;
                case  0:	secondToLastMove = AxisMoves.MOVE_DOWN; break;
                case  1:	secondToLastMove = AxisMoves.MOVE_RIGHT; break;
            }
        } else if (lastMove === AxisMoves.MOVE_LEFT) {
            switch(state[AxisDisk.DISK_RIGHT].M) {
                case -1:	secondToLastMove = AxisMoves.MOVE_DOWN; break;
                case  0:	secondToLastMove = AxisMoves.MOVE_RIGHT; break;
                case  1:	secondToLastMove = AxisMoves.MOVE_UP; break;
            }
        } else if (lastMove === AxisMoves.MOVE_DOWN) {
            switch(state[AxisDisk.DISK_TOP].M) {
                case -1:	secondToLastMove = AxisMoves.MOVE_RIGHT; break;
                case  0:	secondToLastMove = AxisMoves.MOVE_UP; break;
                case  1:	secondToLastMove = AxisMoves.MOVE_LEFT; break;
            }
        } else {
            switch(state[AxisDisk.DISK_LEFT].M) {
                case -1:	secondToLastMove = AxisMoves.MOVE_UP; break;
                case  0:	secondToLastMove = AxisMoves.MOVE_LEFT; break;
                case  1:	secondToLastMove = AxisMoves.MOVE_DOWN; break;
            }
        }

        // Calculate trivial antedecedent state.
        var diskOppositeLastMove = diskOppositeMove(lastMove);
        var trivialAntedecedent = state.map(function(o, i) {
            var index = o.clone();
            if (i !== diskOppositeLastMove) {
                index = previousIndexMatchingM(index, index.M);
            }
            return index;
        });

        var diskOppositeSecondToLastMove = diskOppositeMove(secondToLastMove);

        // Get the 3 relevant indices for the free disk.
        var freeDiskIndices = [];
        var index = state[diskOppositeSecondToLastMove].clone();
        for (var i = 0; i < 3; ++i) {
            index.M--;
            if (index.M < -1) {
                index.M = 1;
                index.N--;
            }
            index.N = (index.N + 5) % 5;
            freeDiskIndices.push(index.clone());
        }

        // Free disk antedecedents will derive from a state with the other two relevant wheels
        // adjusted backward to reflect the correct N,M values.
        var antedecentState = state.map(o => o.clone());
        var targetDisks = targetDisksForMoveDirections(lastMove, secondToLastMove);
        var targetMs = targetMForMoveDirections(lastMove, secondToLastMove);
        antedecentState[targetDisks[0]] = previousIndexMatchingM(antedecentState[targetDisks[0]], targetMs[0]);
        antedecentState[targetDisks[1]] = previousIndexMatchingM(antedecentState[targetDisks[1]], targetMs[1]);

        // Build result array from trivial and free disk antedecedents.
        var antedecedents = [trivialAntedecedent];
        for (var i = 0; i < freeDiskIndices.length; ++i) {
            var antedecedent = antedecentState.map(o => o.clone());
            antedecedent[diskOppositeSecondToLastMove] = freeDiskIndices[i];
            antedecedents.push(antedecedent);
        }
        return antedecedents;
    } else {
        return null;
    }

    // HELPER FUNCTIONS

    function diskOppositeMove(move) {
        switch(move) {
            case AxisMoves.MOVE_UP:	return AxisDisk.DISK_BOTTOM; break;
            case AxisMoves.MOVE_LEFT:	return AxisDisk.DISK_RIGHT; break;
            case AxisMoves.MOVE_DOWN:	return AxisDisk.DISK_TOP; break;
            case AxisMoves.MOVE_RIGHT:	return AxisDisk.DISK_LEFT; break;
        }
    }

    // Magic numbers to translate move directions into disk positions!! oh no.
    function targetDisksForMoveDirections(last, secondToLast) {
        if ((last === AxisMoves.MOVE_UP && secondToLast === AxisMoves.MOVE_DOWN) ||
            (last === AxisMoves.MOVE_LEFT && secondToLast === AxisMoves.MOVE_RIGHT) ||
            (last === AxisMoves.MOVE_DOWN && secondToLast === AxisMoves.MOVE_UP) ||
            (last === AxisMoves.MOVE_RIGHT && secondToLast === AxisMoves.MOVE_LEFT)) {
            return [last % 4, secondToLast % 4];
        } else {
            return [last-1, secondToLast-1];
        }
    }

    // Calculated to match with targetDisksForMoveDirections() above.
    function targetMForMoveDirections(last, secondToLast) {
        if (secondToLast === AxisMoves.MOVE_UP) {
            switch(last) {
                case AxisMoves.MOVE_LEFT:	return [-1, 0]; break;
                case AxisMoves.MOVE_DOWN:	return [1, -1]; break;
                case AxisMoves.MOVE_RIGHT:	return [1, 0]; break;
            }
        } else if (secondToLast === AxisMoves.MOVE_LEFT) {
            switch(last) {
                case AxisMoves.MOVE_UP:	return [1, 0]; break;
                case AxisMoves.MOVE_DOWN:	return [-1, 0]; break;
                case AxisMoves.MOVE_RIGHT:	return [1, -1]; break;
            }
        } else if (secondToLast === AxisMoves.MOVE_DOWN) {
            switch(last) {
                case AxisMoves.MOVE_UP:	return [1, -1]; break;
                case AxisMoves.MOVE_LEFT:	return [1, 0]; break;
                case AxisMoves.MOVE_RIGHT:	return [-1, 0]; break;
            }
        } else {
            switch(last) {
                case AxisMoves.MOVE_UP:	return [-1, 0]; break;
                case AxisMoves.MOVE_LEFT:	return [1, -1]; break;
                case AxisMoves.MOVE_DOWN:	return [1, 0]; break;
            }
        }
    }

    function previousIndexMatchingM(index, m) {
        index = index.clone();
        do {
            index.M--;
            if (index.M < -1) {
                index.M = 1;
                index.N--;
            }
            index.N = (index.N + 5) % 5;	
        } while (index.M !== m);
        return index;
    }
}