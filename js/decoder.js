'option strict';
var states = new AxisStates();

/* This code is really bad. How *not* to write front-end JS: mix UI
** and logic code, spooky action at a distance. <3 prevarikate. */

var decoder = new Decoder();
var decoderHistory = [];
document.addEventListener('DOMContentLoaded', function(){
    var htmlCards = Array.from(document.querySelectorAll('.card'));
    htmlCards.filter(el => el.id !== 'start').forEach(el => hideCard(el));

    for (const htmlCard of htmlCards) {			
        var cardActions = cards[htmlCard.id];
        if (cardActions) {
            for (const func of Object.keys(cardActions)) {
                if (func === 'setup') {
                    cardActions.setup(htmlCard);
                } else {
                    htmlCard.addEventListener(func, cardActions[func]);
                }
            }
        }

        // MUST follow card actions, because we want click handlers in setup()s to be added first
        Array.from(htmlCard.querySelectorAll('input[type=button][data-next-card]')).forEach(function(el){
                el.addEventListener('click', transitionCards(htmlCard.id, el.dataset.nextCard));
        });
    }

    Array.from(document.querySelectorAll('input[type=button][data-nav-back]')).forEach(el => el.addEventListener('click', back));
});

const cards = {
    'start': {
        setup: function() {
            decoderHistory.push('start');
            // firefox will persist form options on a reload, make sure this is cleared
            document.forms['decoder'].reset();
            document.getElementById('locker-unlocker-only').addEventListener('click', function(){
                decoder.clearProgressPast('firstBindingDisk');
                decoder.set('onlyFactoryCombos', true);
                decoder.set('forceOnlyFactoryCombos', true);
                clearRadioOption('firstDiskGatePosition');
            });
            document.getElementById('simplify-possibilities').addEventListener('click', function(){
                decoder.set('onlyFactoryCombos', false);
                decoder.set('forceOnlyFactoryCombos', false);
            });
        },
        onShow: function(){},
        onHide: function(){}
    },

    'combination-listing': {
        setup: function() {
            document.forms['decoder'].elements['onlyFactoryCombos'].addEventListener('change', generateCombinations);
        },
        onShow: function(){
            document.forms['decoder'].elements['onlyFactoryCombos'].checked = !!decoder.onlyFactoryCombos;
            if (!!decoder.forceOnlyFactoryCombos) {
                document.forms['decoder'].elements['onlyFactoryCombos'].disabled = true;
            } else {
                document.forms['decoder'].elements['onlyFactoryCombos'].removeAttribute('disabled');
            }

            generateCombinations();
        },
        onHide: function(){
            document.getElementById('combinations').innerHTML = '';
        }
    },

    'identify-first-binding-disk': {
        setup: function() {
            document.forms['decoder'].elements['firstBindingDisk'].addEventListener('change', function(e){
                decoder.set('firstBindingDisk', AxisDisk[`DISK_${e.currentTarget.value.toUpperCase()}`]);
                // TODO: this is basically "clear forward values"
                clearRadioOption('firstDiskGatePosition');

                const steppingDirections = Decoder.steppingDirections(decoder.firstBindingDisk);
                const shortSteppingDirections = steppingDirections.map(x => AxisHumanReadableHelper.moveTo('short')(x));
                const longSteppingDirections = steppingDirections.map(x => AxisHumanReadableHelper.moveTo('long')(x));

                // change wording on cards to match our unnormalized directions
                for (var i = 1; i <= 3; ++i) {
                    Array.from(document.querySelectorAll('[data-stepping-direction-' + i + ']')).forEach(el => el.innerText = shortSteppingDirections[i-1]);
                }
                Array.from(document.querySelectorAll('[data-first-binding-disk]')).forEach(el => el.innerText = AxisHumanReadableHelper.diskToLong(decoder.firstBindingDisk).toLowerCase());
                Array.from(document.querySelectorAll('[data-full-stepping-pattern]')).forEach(el => el.innerText = longSteppingDirections.join(', '));
                Array.from(document.querySelectorAll('[data-stepping-pattern]')).forEach(el => el.innerText = shortSteppingDirections.join(' '));
                Array.from(document.querySelectorAll('[data-full-move-opposite-first-binding-disk]')).forEach(el => el.innerText = AxisHumanReadableHelper.moveTo('long')(decoder.moveOppositeFirstBindingDisk()));
                Array.from(document.querySelectorAll('[data-move-opposite-first-binding-disk]')).forEach(el => el.innerText = AxisHumanReadableHelper.moveTo('short')(decoder.moveOppositeFirstBindingDisk()));
            });
            document.forms['decoder'].elements['firstBindingDisk'].dispatchEvent(new Event('change'));
        }
    },

    'identify-gate-on-first-binding-disk': {
        setup: function(el){
            enableButtonsWithRadioSelection(el.querySelectorAll("[data-nav-next]"), 'firstDiskGatePosition');
            el.querySelector('[data-next-card=suggest-locker-unlocker]').addEventListener('click', function() { decoder.clearProgressIncluding('firstBindingDiskGatePosition'); clearRadioOption('firstDiskGatePosition'); });
            el.querySelector('[data-next-card=combination-listing]').addEventListener('click', function(){
                decoder.set('onlyFactoryCombos', true);
                decoder.set('forceOnlyFactoryCombos', true);
            });
            el.querySelector('[data-next-card=identify-dragging-move-with-click]').addEventListener('click', function(){
                decoder.set('onlyFactoryCombos', false);
                decoder.set('forceOnlyFactoryCombos', false);
            });
            Array.from(document.forms['decoder'].elements['firstDiskGatePosition']).forEach(el => el.addEventListener('change', function(e) { decoder.set('firstBindingDiskGatePosition', +e.currentTarget.value); clearRadioOption('draggingMoveWithClick'); }));
        },
    },

    'identify-dragging-move-with-click': {
        setup: function(el) {
            enableButtonsWithRadioSelection(el.querySelectorAll("[data-nav-next]"), 'draggingMoveWithClick');
            Array.from(document.forms['decoder'].elements['draggingMoveWithClick']).forEach(el => el.addEventListener('change', function(e){ decoder.set('draggingMoveWithClick', +e.currentTarget.value); clearRadioOption('modifiedDraggingMoveWithClick'); }));
        },
        onShow: function() {
            const quickSequence = decoder.quickSequenceToFirstBindingGate();
            if (quickSequence) {
                Array.from(document.querySelectorAll('[data-dragging-moves]')).forEach(function(el){
                    var which = el.closest('label').querySelector('[name=draggingMoveWithClick]');
                    el.innerText = "0 " + formatMoveSequence(quickSequence.concat(new Array( (which.value === "1" ? 5 : +which.value-1) ).fill(Decoder.normalizeMove(AxisMoves.MOVE_DOWN, decoder.firstBindingDisk))).map(x => AxisHumanReadableHelper.moveTo('short')(x)));
                });
            }
        }
    },

    'identify-modified-dragging-move-with-click': {
        setup: function(el){
            enableButtonsWithRadioSelection(el.querySelectorAll("[data-nav-next]"), 'modifiedDraggingMoveWithClick');
            el.querySelector("[data-next-card=combination-listing]").addEventListener('click', () => decoder.clearProgressPast('modifiedDraggingMoveWithClick'));
            Array.from(document.forms['decoder'].elements['modifiedDraggingMoveWithClick']).forEach(el => el.addEventListener('change', e => decoder.modifiedDraggingMoveWithClick = +e.currentTarget.value));
        },
        onShow: function() {
            const adjustedQuickSequence = decoder.adjustedQuickSequenceToFirstBindingGate();
            Array.from(document.querySelectorAll('[data-modified-dragging-moves]')).forEach(function(el){
                var which = el.closest('label').querySelector('[name=modifiedDraggingMoveWithClick]');
                // performing [R D] [quick seq] advances the right wheel by 2, and the bottom wheel by 1, so we need to show sequences that are effectively 0, -1 and -2.
                var possibleClickOnDrag = (((+which.value - decoder.draggingMoveWithClick - 5) % 5) >= -2);
                if (possibleClickOnDrag) {
                    el.innerText = "0 " + formatMoveSequence(adjustedQuickSequence.concat(new Array( (which.value === "1" ? 5 : +which.value-1) ).fill(Decoder.normalizeMove(AxisMoves.MOVE_DOWN, decoder.firstBindingDisk))).map(x => AxisHumanReadableHelper.moveTo('short')(x)));
                    which.disabled = false;
                    el.closest('li').style.display = 'revert';
                } else {
                    which.disabled = true;
                    el.closest('li').style.display = 'none';
                }
            });
        }
    },

    'identify-gate-on-second-binding-disk': {
        setup: function(el) {
            enableButtonsWithRadioSelection(el.querySelectorAll("[data-nav-next]"), 'partialMoveWithClickSecondGate');
            Array.from(document.forms['decoder'].elements['partialMoveWithClickSecondGate']).forEach(el => el.addEventListener('change', e => decoder.partialMoveWithClickSecondGate = +e.currentTarget.value));

        },
        onShow: function() {
            // TODO: BUG: we need to create actual partial move sequence, respecting unreachable areas
            const partialMoveSequence = Decoder.reverseSteppingDirections(decoder.secondBindingDisk()).map(AxisMoves.createPartialMove);
            const quickSequence = decoder.quickSequenceToFirstBindingGate();
            const draggingOvershoot = new Array(decoder.draggingMoveWithClick).fill(Decoder.normalizeMove(AxisMoves.MOVE_DOWN, decoder.firstBindingDisk));
            const draggingOvershootSequence = quickSequence.concat(draggingOvershoot);

            Array.from(document.querySelectorAll('[data-partial-moves-second-gate]')).forEach(function(el, i){
                var which = el.closest('label').querySelector('[name=partialMoveWithClickSecondGate]');

                el.innerText = "0 " + formatMoveSequence(draggingOvershootSequence.concat(partialMoveSequence.concat(partialMoveSequence).slice(0, i+1)).map(AxisHumanReadableHelper.moveTo('short')));
                // performing [R D] [quick seq] advances the right wheel by 2, and the bottom wheel by 1, so we need to show sequences that are effectively 0, -1 and -2.
                //var possibleClickOnDrag = (((+which.value - draggingMoveWithClick - 5) % 5) >= -2);
                //if (possibleClickOnDrag) {
                //	el.innerText = adjustedQuickSequence.concat(new Array( (which.value === "1" ? 5 : +which.value-1) ).fill(normalizeMove(firstBindingDisk, "D")).join('')).join(' ');
                //}
            });
        }
    },

    'confirm-assume-last-move-in-dragging-direction': {
        setup: function(el) {
            Array.from(el.querySelectorAll("[data-next-card], [data-nav-back]")).forEach(el =>
                el.addEventListener('click', function(){
                    if (typeof el.dataset.nextCard !== "undefined" && el.dataset.nextCard === "combination-listing") {
                        decoder.clearProgressIncluding('draggingMoveWithClick');
                        clearRadioOption('draggingMoveWithClick');
                        decoder.set('assumeLastMoveInDraggingDirection', true);
                        document.forms['decoder'].elements['assumeLastMoveInDraggingDirection'].value = "1";
                    } else {
                        decoder.set('assumeLastMoveInDraggingDirection', false);
                        document.forms['decoder'].elements['assumeLastMoveInDraggingDirection'].value = "0";
                    }
                })
            );
            el.querySelector("[data-set-top-gate-adjacent]").addEventListener('click', function(){
                // set the gate to be one forward of what was previously tried.
                var gate = decoder.firstDiskGatePosition;
                if (gate > 0) {
                    decoder.firstDiskGatePosition = (gate === 15 ? 1 : gate+1);
                    document.forms['decoder'].elements['firstDiskGatePosition'].value = decoder.firstDiskGatePosition.toString();
                }
            });
        }
    },

    'suggest-locker-unlocker': {
        setup: function(el) {
            el.querySelector('[data-next-card=combination-listing]').addEventListener('click', function(){
                decoder.clearAllProgress();
                clearRadioOption('firstDiskGatePosition'); // TODO: is "clear forward data"
                decoder.set('onlyFactoryCombos', true);
                decoder.set('forceOnlyFactoryCombos', true);
            });
        }
    }
 };

/*
** Expects an array of combinations with form
** { combo: string, [indicesForMultiplePulls: [number, ...]] }
*/
function outputCombinations(combinations) {
    var elements = combinations.map(function(o) {
        var el = document.createElement('div');
        el.classList.add('combination');
        el.innerText = "0 ";

        o.combo.split('')
          .map((c, i) => ((o.indicesForMultiplePulls && o.indicesForMultiplePulls.includes(i)) || i === o.combo.length-1) ? pullElement(c) : document.createTextNode(" " + c))
          .forEach(function(e) { el.appendChild(e); });

        return el;
    });

    var outputEl = document.getElementById('combinations');
    outputEl.innerHTML = "";
    outputEl.append.apply(outputEl, elements);

    function pullElement(s) {
        var result = document.createElement('span');
        result.classList.add('pull');
        result.innerText = " " + s;
        return result;
    }
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

function generateCombinations() {
    const matchingCombinations = decoder.matchingCombinations();

    Array.from(document.querySelectorAll('[data-total-combinations]')).forEach(el => el.innerText = matchingCombinations.map(o => o.indicesForMultiplePulls ? o.indicesForMultiplePulls.length : 1).reduce((a,b) => a+b, 0));
    outputCombinations(matchingCombinations);
}

function hideCard(el) { el.style.display = 'none'; el.dispatchEvent(new Event('onHide')); }
function showCard(el, skipHistory) {
    el.style.display = '';
    el.dispatchEvent(new Event('onShow'));
    if (!skipHistory) {
        decoderHistory.push(el.id);
    };
    window.scrollTo(0,0);
}
function transitionCards(prev, next, skipHistory) {
    return function(){
        hideCard(document.getElementById(prev));
        showCard(document.getElementById(next), skipHistory);
    }
}
function back() {
    if (decoderHistory.length > 1) {
        transitionCards(decoderHistory.pop(), decoderHistory[decoderHistory.length-1], true)();
    }
}

function enableButtonsWithRadioSelection(buttons, name) {
    buttons.forEach(function(button){
        enableButtonWithRadioSelection(button, name);
        for (var i = 0, radioOptions = document.forms['decoder'][name]; i < radioOptions.length; ++i) {
            radioOptions[i].addEventListener('change', function(){ enableButtonWithRadioSelection(button, name) });
        }
    });
}
function enableButtonWithRadioSelection(button, name) {
    button.disabled = !document.querySelector('input[name="' + name + '"]:checked');
}
function clearRadioOption(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    if (el) {
        el.checked = false;
        el.dispatchEvent(new Event('change'));
    }
}