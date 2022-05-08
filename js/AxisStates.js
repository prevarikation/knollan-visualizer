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
    var i, j, len, temp;
    var pos = 0;

    for (var i = 0; i <= 2984; ++i) {
        pos += AxisStates.distanceCodingTable[StateTable1.stateTable1[i] % 16];
        temp = Math.floor(StateTable1.stateTable1[i] / 16);
        len = temp % 16;
        temp = Math.floor(temp / 16);
        AxisStates.CombinationTable[pos] = "";
        for (j = 0; j <= len - 1; j++)
        {
            AxisStates.CombinationTable[pos] += AxisStates.movementCodingTable[temp % 4];
            temp = Math.floor(temp / 4);
        }
    }
    for (i = 0; i <= 4514; i++)
    {
        pos += AxisStates.distanceCodingTable[StateTable2.stateTable2[i] % 16];
        temp = Math.floor(StateTable2.stateTable2[i] / 16);
        len = temp % 16;
        temp = Math.floor(temp / 16);
        AxisStates.CombinationTable[pos] = "";
        for (j = 0; j <= len - 1; j++)
        {
            AxisStates.CombinationTable[pos] += AxisStates.movementCodingTable[temp % 4];
            temp = Math.floor(temp / 4);
        }
    }
    AxisStates.CombinationTable[3616] = "<Reset>";
}
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
        return "<invalid state>";
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
    if ((Combination == "<invalid state>") || (Combination == "Sequence") || (Combination == "<Reset>")){
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
    if ((Combination == "<invalid state>") || (Combination == "Sequence") || (Combination == "<Reset>")){
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
