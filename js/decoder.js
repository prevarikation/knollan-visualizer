'use strict';

import { Decoder, formatMoveSequence } from './decoder-model.js';

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
            el.addEventListener('click', (e) => transitionCards(htmlCard.id, e.currentTarget.dataset.nextCard)());
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
            document.forms['decoder'].elements['lockerUnlockerOnly'].addEventListener('click', function(){
                decoder.clearProgressPast('firstBindingDisk');
                decoder.set('onlyFactoryCombos', true);
                decoder.set('forceOnlyFactoryCombos', true);
            });
            document.forms['decoder'].elements['simplifyPossibilities'].addEventListener('click', function(){
                decoder.set('onlyFactoryCombos', false);
            });
        }
    },

    'combination-listing': {
        setup: function(el) {
            document.forms['decoder'].elements['onlyFactoryCombos'].addEventListener('change', function(e){
                decoder.onlyFactoryCombos = e.currentTarget.checked;
                el.dispatchEvent(new Event('onCombinationChanges'));   
            });
            document.getElementById('combinations').addEventListener('click', nextHighlight);

            function nextHighlight() {
                let old = document.getElementById('combinations').querySelector('.combination.highlight');
                if (old) {
                    old.classList.remove('highlight');
                    old.nextElementSibling.classList.add('highlight');
                }
            }
        },
        onShow: function(e){
            document.forms['decoder'].elements['onlyFactoryCombos'].checked = !!decoder.onlyFactoryCombos;
            if (!!decoder.forceOnlyFactoryCombos) {
                document.forms['decoder'].elements['onlyFactoryCombos'].disabled = true;
            } else {
                document.forms['decoder'].elements['onlyFactoryCombos'].removeAttribute('disabled');
            }
            e.currentTarget.dispatchEvent(new Event('onCombinationChanges'));
        },
        onHide: function(){
            document.getElementById('combinations').innerHTML = '';
            // these not sticky! must be manually set each time
            decoder.set('forceAllAndOnlyLockerUnlockerCombos', false);
            decoder.set('forceOnlyFactoryCombos', false);
            decoder.set('assumeLastMoveInDraggingDirection', false);
        },
        onCombinationChanges: function() {
            generateCombinations();
            let firstCombination = document.getElementById('combinations').firstElementChild;
            if (firstCombination) {
                firstCombination.classList.add('highlight');
            }
        }
    },

    'identify-first-binding-disk': {
        setup: function() {
            document.forms['decoder'].elements['firstBindingDisk'].addEventListener('change', function(e){
                decoder.set('firstBindingDisk', e.currentTarget.value);

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
            autoEnableForwardButtonsWithSelection(el);
            autoSyncChangesToModel(el);
            el.querySelector('[data-next-card=combination-listing]').addEventListener('click', function(){
                decoder.set('onlyFactoryCombos', true);
                decoder.set('forceOnlyFactoryCombos', true);
            });
            el.querySelector('[data-next-card=identify-dragging-move-with-click]').addEventListener('click', function(){
                decoder.set('onlyFactoryCombos', false);
            });
        },
        onShow: function(e) {
            setOptionsFromDecoderModel(e.currentTarget);
            updateForwardButtons(e.currentTarget);
        }
    },

    'identify-dragging-move-with-click': {
        setup: function(el) {
            autoEnableForwardButtonsWithSelection(el);
            autoSyncChangesToModel(el);
        },
        onShow: function(e) {
            const quickSequence = decoder.quickSequenceToFirstBindingGate();
            if (quickSequence) {
                Array.from(document.querySelectorAll('[data-dragging-moves]')).forEach(function(el){
                    var which = el.closest('label').control;
                    el.innerText = "0 " + formatMoveSequence(quickSequence.concat(new Array( (which.value === "1" ? 5 : +which.value-1) ).fill(Decoder.normalizeMove(AxisMoves.MOVE_DOWN, decoder.firstBindingDisk))).map(x => AxisHumanReadableHelper.moveTo('short')(x)));
                });
            }

            setOptionsFromDecoderModel(e.currentTarget);
            updateForwardButtons(e.currentTarget);
        }
    },

    'identify-modified-dragging-move-with-click': {
        setup: function(el){
            autoEnableForwardButtonsWithSelection(el);
            autoSyncChangesToModel(el);
            Array.from(el.querySelectorAll("[data-next-card]")).forEach(el => el.addEventListener('click', function(e) {
                if (e.currentTarget.dataset.nextCard === "combination-listing") {
                    decoder.clearProgressPast('modifiedDraggingMoveWithClick');
                }
            }));
            Array.from(document.forms['decoder'].elements['modifiedDraggingMoveWithClick']).forEach(nestedEl => nestedEl.addEventListener('change', function(e) { 
                let nextCard;
                switch(decoder.howToIsolateSecondGate()) {
                    case Decoder.SECOND_GATE_ISOLATION_TECHNIQUE.PARTIAL_MOVES_ON_SECOND_DISK:             nextCard = 'partial-moves-isolate-gate-on-second-binding-disk'; break;
                    case Decoder.SECOND_GATE_ISOLATION_TECHNIQUE.INDIRECT_VIA_PARTIAL_MOVES_ON_OTHER_DISK: nextCard = 'partial-moves-indirectly-determine-gate-on-second-binding-disk'; break;
                    case Decoder.SECOND_GATE_ISOLATION_TECHNIQUE.UNKNOWN:                                  nextCard = 'combination-listing'; break;
                }
                el.querySelector("[data-nav-next-branching]").dataset.nextCard = nextCard;
            }));
        },
        onShow: function(e) {
            const sequencesWithPossibleClickOnDrag = decoder.adjustedQuickSequencesWithPossibleClickOnDrag();
            if (sequencesWithPossibleClickOnDrag) {
                Array.from(document.querySelectorAll('[data-modified-dragging-moves]')).forEach(function(el){
                    const which = el.closest('label').control;

                    const sequenceForWhich = sequencesWithPossibleClickOnDrag[+which.value];
                    if (sequenceForWhich) {
                        el.innerText = "0 " + formatMoveSequence(sequenceForWhich.map(x => AxisHumanReadableHelper.moveTo('short')(x)));
                    }
                    which.disabled = !sequenceForWhich;
                    el.closest('li').style.display = (!!sequenceForWhich ? 'revert' : 'none');
                });
            }

            setOptionsFromDecoderModel(e.currentTarget);
            updateForwardButtons(e.currentTarget);
        }
    },

    'partial-moves-isolate-gate-on-second-binding-disk': {
        setup: function(el) {
            autoEnableForwardButtonsWithSelection(el);
            autoSyncChangesToModel(el);
            el.querySelector("[data-next-card=suggest-combination-listing-with-current-data]").addEventListener('click', function(){ decoder.clearProgressIncluding('partialMoveWithClickSecondGate'); });
        },
        onShow: function(e) {
            const partialMoveSequences = decoder.secondBindingDiskPartialMoveSequencesToIsolateGate();
            Array.from(document.querySelectorAll('[data-partial-moves-second-gate]')).forEach(function(el){
                let which = el.closest('label').control;
                el.innerText = "0 " + formatMoveSequence(partialMoveSequences[+which.value].map(AxisHumanReadableHelper.moveTo('short')));
            });

            setOptionsFromDecoderModel(e.currentTarget);
            updateForwardButtons(e.currentTarget);
        }
    },

    'partial-moves-indirectly-determine-gate-on-second-binding-disk': {
        setup: function(el) {
            autoEnableForwardButtonsWithSelection(el);
            autoSyncChangesToModel(el, function(arr){ return { positive: arr }; });
            el.querySelector("[data-next-card=suggest-combination-listing-with-current-data]").addEventListener('click', function(){ decoder.clearProgressIncluding('partialMoveWithResistanceOnNonBindingDisk'); });
            let options = Array.from(document.forms['decoder'].elements[optionNamesAsChildrenOf(el)[0]]);
            el.querySelector("[data-no-options-apply]").addEventListener('click', function(){
                let inapplicableGates = options.filter(el => el.value !== "").reduce((prev, cur) => prev.concat(cur.value), []);
                decoder.partialMoveWithResistanceOnNonBindingDisk = { negative: inapplicableGates }; 
            });

            // TODO: dynamic dispatch here
            Array.from(document.forms['decoder'].elements['partialMoveWithResistanceOnNonBindingDisk']).forEach(nestedEl => nestedEl.addEventListener('change', function(e) { 
                let nextCard;
                switch(decoder.howToIsolateThirdGate()) {
                    case Decoder.THIRD_GATE_ISOLATION_TECHNIQUE.CHECK_THIRD_DISK_BINDING_ORDER: nextCard = 'third-binding-disk-check-binding-order'; break;
                    case Decoder.THIRD_GATE_ISOLATION_TECHNIQUE.UNKNOWN:                        nextCard = 'combination-listing'; break;
                }
                el.querySelector("[data-nav-next-branching]").dataset.nextCard = nextCard;
            }));
        },
        onShow: function(e) {
            const uiEls = Array.from(document.querySelectorAll('[data-partial-move-with-resistance-on-non-binding-disk]'));
            uiEls.forEach(function(el){
                let which =  el.closest('label').control;
                which.value = "";
                el.disabled = true;
                el.closest('li').style.display = 'none';
            });

            const applicablePartialMoveSequences = decoder.partialMoveSequencesToIsolateGateOnSecondBindingDiskUsingNonBindingDisks();
            Object.entries(applicablePartialMoveSequences).forEach(function(o, i) {
                let which = uiEls[i].closest('label').control;
                which.value = o[0];
                uiEls[i].innerText = "0 " + formatMoveSequence(o[1].map(AxisHumanReadableHelper.moveTo('short')));
                uiEls[i].removeAttribute('disabled');
                uiEls[i].closest('li').style.display = 'revert';
            });

            setOptionsFromDecoderModel(e.currentTarget, (o) => o.positive || []);
            updateForwardButtons(e.currentTarget);
        }
    },

    'third-binding-disk-check-binding-order': {
        setup: function(el) {
            autoEnableForwardButtonsWithSelection(el);
            autoSyncChangesToModel(el, function(arr){
                const result = { bindsUnconditionally: false, trueBindingOrderIsObserved: false };
                arr.forEach(prop => result[prop] = true);
                return result;
            });
            el.querySelector("[data-next-card=suggest-combination-listing-with-current-data]").addEventListener('click', function(){ decoder.clearProgressIncluding('thirdBindingDiskBindingOrderCheckResults'); });
        },
        onShow: function(e) {
            const uiEls = Array.from(document.querySelectorAll('[data-third-binding-disk-binding-order-check-results]'));
            const sequences = decoder.thirdBindingDiskPartialMoveSequencesToCheckBindingOrder();
            Object.entries(sequences).forEach(function(o) {
                uiEls.filter(el => el.closest('label').control.value === o[0])[0].innerText = "0 " + formatMoveSequence(o[1].map(AxisHumanReadableHelper.moveTo('short')));
            });

            setOptionsFromDecoderModel(e.currentTarget, (o) => Object.keys(o).filter(key => o[key]));
            updateForwardButtons(e.currentTarget);
        }
    },

    'confirm-assume-last-move-in-dragging-direction': {
        setup: function(el) {
            Array.from(el.querySelectorAll("[data-next-card], [data-nav-back]")).forEach(el =>
                el.addEventListener('click', () => decoder.set('assumeLastMoveInDraggingDirection', (el.dataset.nextCard === "combination-listing")))
            );
            el.querySelector("[data-set-top-gate-adjacent]").addEventListener('click', function(){
                // set the gate to be one forward of what was previously tried.
                var gate = decoder.firstBindingDiskGatePosition;
                if (gate) {
                    decoder.set('firstBindingDiskGatePosition', (gate === 15 ? 1 : gate+1));
                    document.forms['decoder'].elements['firstBindingDiskGatePosition'].value = decoder.firstBindingDiskGatePosition.toString();
                }
            });
        }
    },

    'suggest-locker-unlocker': {
        setup: function(el) {
            el.querySelector('[data-next-card=combination-listing]').addEventListener('click', function(){
                decoder.set('forceAllAndOnlyLockerUnlockerCombos', true);
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
        el.innerText = "0";

        o.combo.split('')
          .map((c, i, arr) => ((o.indicesForMultiplePulls && o.indicesForMultiplePulls.includes(i)) || i === o.combo.length-1) ? pullElement(c) : document.createTextNode(((c !== arr[i-1] || (o.indicesForMultiplePulls && o.indicesForMultiplePulls.includes(i-1)) ) ? " " : "") + c))
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

function generateCombinations() {
    const matchingCombinations = decoder.matchingCombinations();

    Array.from(document.querySelectorAll('[data-total-combinations]')).forEach(el => el.innerText = matchingCombinations.map(o => o.indicesForMultiplePulls ? o.indicesForMultiplePulls.length : 1).reduce((a,b) => a+b, 0));
    outputCombinations(matchingCombinations);
}

function hideCard(el) { el.classList.add('hidden'); el.dispatchEvent(new Event('onHide')); }
function showCard(el, skipHistory) {
    el.classList.remove('hidden');
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
function back(e) {
    if (decoderHistory.length <= 1) {
        return;
    }

    const backUntil = e.currentTarget.dataset.navBackUntil;
    if (backUntil) {
        let thisCard = decoderHistory[decoderHistory.length-1];
        let cardIdxInHistory = decoderHistory.lastIndexOf(backUntil);
        if (cardIdxInHistory !== -1) {
            decoderHistory.splice(cardIdxInHistory+1, decoderHistory.length);
            transitionCards(thisCard, decoderHistory[decoderHistory.length-1], true)();
        }
    } else {
        transitionCards(decoderHistory.pop(), decoderHistory[decoderHistory.length-1], true)();
    }
}

function autoSyncChangesToModel(el, conversionFunc) {
    let optionNames = optionNamesAsChildrenOf(el);
    for (let name of optionNames) {
        const type = document.forms['decoder'].elements[name][0].type;
        if (type === 'checkbox') {
            Array.from(document.forms['decoder'].elements[name]).forEach(el => el.addEventListener('change', wrapCheckboxValuesInArray));
        } else if (type === 'radio') {
            Array.from(document.forms['decoder'].elements[name]).forEach(el => el.addEventListener('change', function(e){ decoder.set(name, (conversionFunc || autoPromoteToInteger)(e.currentTarget.value)); }));
        }
    }

    function autoPromoteToInteger(x) {
        let int = +x;
        return (!Number.isNaN(int) ? int : x);
    }
    function wrapCheckboxValuesInArray(e) {
        const wrapped = Array.from(document.forms['decoder'].elements[e.currentTarget.name]).filter(el => el.checked).map(el => autoPromoteToInteger(el.value));
        decoder.set(e.currentTarget.name, (conversionFunc || identity)(wrapped));
    }
    function identity(x) { return x; }
}
function autoEnableForwardButtonsWithSelection(el) {
    optionNamesAsChildrenOf(el).forEach(name => enableButtonsWithSelection(el.querySelectorAll("[data-nav-next-only-with-selection]"), name));
}
function enableButtonsWithSelection(buttons, name) {
    buttons.forEach(function(button){
        let toggle = togglingFunc(button, name);
        toggle();
        for (var i = 0, options = document.forms['decoder'][name]; i < options.length; ++i) {
            options[i].addEventListener('change', toggle);
        }
        button.addEventListener('uiUpdate', toggle);
    });

    function togglingFunc(button, name) { return function(){ enableButtonWithSelection(button, name); }; }
}
function enableButtonWithSelection(button, name) {
    button.disabled = !document.querySelector('input[name="' + name + '"]:checked');
}
function setOptionsFromDecoderModel(el, conversionFunc) {
    for (let name of optionNamesAsChildrenOf(el)) {
        const els = document.forms['decoder'].elements[name];
        const type = els[0].type;
        if (type === 'checkbox') {
            Array.from(els).forEach(x => x.checked = false);
            if (decoder[name]) {
                (conversionFunc || identity)(decoder[name]).forEach(val => Array.from(els).filter(x => x.value === val.toString()).forEach(x => x.checked = true));
            }
        } else if (type === 'radio') {
            if (decoder[name]) {
                els.value = (conversionFunc || identity)(decoder[name]).toString();
            }
            let checkedEl = document.querySelector('input[name="' + name + '"]:checked');
            if (!decoder[name] && checkedEl) {
                    checkedEl.checked = false;
            }
        }
    }
    function identity(x) { return x; }
}
function updateForwardButtons(el) {
    Array.from(el.querySelectorAll("[data-nav-next-only-with-selection]")).forEach(button => button.dispatchEvent(new Event('uiUpdate')));
}
function optionNamesAsChildrenOf(el) {
    // uniqueness reduce() here isn't great but there shouldn't be that many options on a page (probably just one)
    return Array.from(el.querySelectorAll("input[type=radio], input[type=checkbox]")).reduce((prev, cur) => (prev.includes(cur.name) ? prev : prev.concat(cur.name)), []);
}