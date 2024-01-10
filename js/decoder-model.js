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
    constructor() {}

    set(prop, val) {
        this[prop] = val;

        var positionInDependencies = Decoder.dependencies.indexOf(prop);
        if (positionInDependencies !== -1) {
            for (var i = positionInDependencies + 1; i < Decoder.dependencies.length; ++i) {
                this[Decoder.dependencies[i]] = undefined;
            }
        }
    }
}
Decoder.dependencies = [
    'firstBindingDisk',
    'firstBindingDiskGatePosition',
    'draggingMoveWithClick',
    'modifiedDraggingMoveWithClick',
    'secondBindingDisk',
    'secondBindingDiskGatePosition'
];


function formatMoveSequence(moves) {
    return moves.reduce(function(a,b){ return (!a.length || a[a.length-1] === b ? a + b : a + ' ' + b); }, '');
}