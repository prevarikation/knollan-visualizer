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

/* Note, globally, that we aren't using any static variables, because Safari
** doesn't support them. */

class AxisVisualizer
{
    constructor(outputCanvas) {
        this.outputCanvas = outputCanvas;
        var visualizer = document.getElementById('visualizer');
        var canvas = outputCanvas.cloneNode(false);
        canvas.id = 'workingCanvas';
        this.ctx = canvas.getContext('2d');

        this.staticLayer = canvas.cloneNode(false);
        var statics = [
            new AxisBackground(this.staticLayer, document.getElementById("background")),
            new AxisGateTestingPiece(this.staticLayer, AxisVisualizer.centerX, AxisVisualizer.centerY)
        ];
        for (var a of statics) {
            a.draw();
        }

        // TODO: fix thiiiiis. needs to be classes etc.
        AxisStates();

        var diskLayer = document.createElement("canvas");
        diskLayer.width = AxisDisk.ACTIVE_DISK_AREA_WIDTH;
        diskLayer.height = diskLayer.width;
        this.disks = {
            layer: diskLayer,
            disks: [
                new AxisDisk(diskLayer, document.getElementById("disk"), 0, AxisDisk.DISK_TOP),
                new AxisDisk(diskLayer, document.getElementById("disk"), 90, AxisDisk.DISK_LEFT),
                new AxisDisk(diskLayer, document.getElementById("disk"), 180, AxisDisk.DISK_BOTTOM),
                new AxisDisk(diskLayer, document.getElementById("disk"), 270, AxisDisk.DISK_RIGHT)
            ],
            draw: function(){
                this.layer.getContext('2d').clearRect(0, 0, this.layer.width, this.layer.height);
                for (var a of this.disks) {
                    a.draw();
                }
                canvas.getContext('2d').drawImage(
                    this.layer,
                    0, 0, this.layer.width, this.layer.height,
                    // subtract 1 for better visual coherency
                    AxisVisualizer.centerX-1 - this.layer.width/2, AxisVisualizer.centerY-1 - this.layer.height/2, this.layer.width, this.layer.height
                );
            }
        };
        this.selectDisk(AxisDisk.DISK_TOP);

        this.knobInterfacePlate = new AxisKnobInterfacePlate(canvas, AxisVisualizer.centerX, AxisVisualizer.centerY);

        this.selectedUIPage = "standard";
        this.dynamicUI = new AxisUI(canvas);
        // for closure purposes
        var visualizerRef = this;
        // override draw() to pass in arguments when invoked without arguments
        this.dynamicUI.superDraw = this.dynamicUI.draw;
        this.dynamicUI.draw = function(){
            var uiPage = visualizerRef.selectedUIPage;
            var options = this.generateOptions();

            this.superDraw(uiPage, options);

            visualizerRef.prevOptions = {
                page: uiPage,
                options: JSON.stringify(options)
            };
        };
        this.dynamicUI.willRedraw = function(){
            var currentOptions = this.generateOptions();
            return currentOptions.currentCombination || // current combination is in "active area" for disks
                   !visualizerRef.prevOptions ||
                   (visualizerRef.prevOptions.page !== visualizerRef.selectedUIPage) ||
                   (visualizerRef.prevOptions.options !== JSON.stringify(currentOptions));
        };
        this.dynamicUI.generateOptions = function() {
            var uiPage = visualizerRef.selectedUIPage;
            var options = {
                shortenedMoves: (visualizerRef.showShortenedMoves ? AxisStates.GetCombination(AxisStates.State2StateNumber.apply(null, visualizerRef.disks.disks.map(o => o.index))) : null),
                rawMoves: null,
                antecedentMoves: null,
                currentCombination: (visualizerRef.showCurrentCombination ? AxisStates.GetCombination(AxisStates.State2StateNumber.apply(null, visualizerRef.disks.disks.map(o => o.gate.index))) : null)
            };
            if (visualizerRef.rawMoveDisplay) {
                var lastResetIndex = visualizerRef.history.lastIndexOf(AxisMoves.MOVE_UNAFFECTED);
                var replayMoves = visualizerRef.history.slice(lastResetIndex).map(AxisMoves.textRepresentationOfMove).join('');
                options.rawMoves = AxisStates.GetRawMoveFormat(replayMoves);
            }
            if (visualizerRef.showAntecedentMoves) {
                var currentState = visualizerRef.disks.disks.map(o => o.index);
				var antecedentStates = AxisStates.GetAntecedentStates(currentState);
				if (antecedentStates) {
					options.antecedentMoves = antecedentStates.map(state => AxisStates.GetCombination(AxisStates.State2StateNumber.apply(null, state))).join(', ');
				} else {
					options.antecedentMoves = "<none>";
				}
            }
            if (uiPage === "standard") {
                options.automaticAnimationTime = AxisVisualizer.AUTOMATIC_ANIMATION_TIME;
            }
            return options;
        };

        this.dynamic = [
            this.disks,
            this.knobInterfacePlate,
            this.dynamicUI
        ];

        this.movingAutomatically = false;
        this.animationStats = null;
        this.history = [];
        this._statesVisited = {};
        this.showShortenedMoves = true;
        this.showCurrentCombination = false;
        this.rawMoveDisplay = false;
        this.showAntecedentMoves = false;
        this.showPartialMoves = false;
        this.lockedGatePositions = false;
        this.reset();
    }

    draw() {
        if (this.dynamicUI.willRedraw()) {
            this.ctx.drawImage(this.staticLayer, 0, 0);
        } else {
            var estimatedWidth = AxisDisk.ACTIVE_DISK_AREA_WIDTH;
            this.ctx.drawImage(
                this.staticLayer,
                AxisVisualizer.centerX - estimatedWidth/2, AxisVisualizer.centerY - estimatedWidth/2, estimatedWidth, estimatedWidth,
                AxisVisualizer.centerX - estimatedWidth/2, AxisVisualizer.centerY - estimatedWidth/2, estimatedWidth, estimatedWidth
            );
        }

        for (var layer of this.dynamic) {
            if (layer !== this.dynamicUI || this.dynamicUI.willRedraw()) {
                layer.draw();
            }
        }
        this.outputCanvas.getContext('2d').drawImage(this.ctx.canvas, 0, 0);
    }

	reset() {
        this.step = 0;
        this.x = 0;
        this.y = 0;

        if (!this.history.length || this.history[this.history.length-1] !== AxisMoves.MOVE_UNAFFECTED) {
            this.history.push(AxisMoves.MOVE_UNAFFECTED);
        }
        //this._statesVisited = {};
        this.currentMovement = AxisMoves.MOVE_UNAFFECTED;

        for (var disk of this.disks.disks) {
            disk.reset();
        }
        this.knobInterfacePlate.reset();
    }

    animate(timestamp) {
        if (this.animationStats === null) {
            this.animationStats = {
                start: timestamp,
                totalSteps: 0
            };
        }

        var elapsed = timestamp - this.animationStats.start;
        if (AxisVisualizer.AUTOMATIC_ANIMATION_TIME === AxisVisualizer.ANIMATION_TIMES.instant) {
            // stop visual flicker on speedy machines
            var expectedSteps = AxisVisualizer.MAX_STEP + 1;
        } else {
            var expectedSteps = Math.floor( (elapsed/AxisVisualizer.AUTOMATIC_ANIMATION_TIME) * AxisVisualizer.MAX_STEP );
        }
        var shouldRepaint = (this.animationStats.totalSteps < expectedSteps);
        while (this.animationStats.totalSteps < expectedSteps) {
            // when beyond the max step, move is changed to MOVE_UNAFFECTED and attemping to step forward will cause an error.
            if (this.currentMovement !== AxisMoves.MOVE_UNAFFECTED) {
                this.nextStep();
            }
            ++this.animationStats.totalSteps;
        }
        if (shouldRepaint) {
            this.draw();
        }

        if (this.currentMovement !== AxisMoves.MOVE_UNAFFECTED) {
            window.requestAnimationFrame(this.animate.bind(this));
        } else {
            this.movingAutomatically = false;
            this.animationStats = null;
        }
    }

    selectDisk(disk) {
        AxisVisualizer.selectedDisk = disk;
        for (var disk of this.disks.disks) {
            disk.colorSelector.visible = (disk.internalDiskNumber === AxisVisualizer.selectedDisk);
        }
    }

    startMovement(direction, isAutomaticMove, isPartialMove) {
        if (isAutomaticMove) {
            if (this.movingAutomatically) {
                return;
            } else {
                this.movingAutomatically = true;
            }
        }

        this.currentMovement = direction;
        this.isPartialMove = isPartialMove;
        AxisVisualizer.automatic = isAutomaticMove;

        if (AxisVisualizer.automatic) {
            window.requestAnimationFrame(this.animate.bind(this));
        } else {
            this.nextStep();
        }
    }

    undoLastMovement() {
        /* going back to last reset and replaying moves seems like the easiest way to get correct disk positions. */
        if (this.history.length > 1) {
            var lastReset = this.history.lastIndexOf(AxisMoves.MOVE_UNAFFECTED, (this.history[this.history.length-1] === AxisMoves.MOVE_UNAFFECTED ? this.history.length-2 : Infinity));
            var replayMoves = this.history.splice(lastReset);
            replayMoves.pop();
            for (var move of replayMoves) {
                if (move === AxisMoves.MOVE_UNAFFECTED) {
                    this.reset();
                } else if (AxisMoves.isSerializedState(move)) {
                    this.restoreParkedState(move);
                } else if (AxisMoves.isDiskTurnMove(move)) {
                    // individual disk rotation move.
                    var turnInfo = AxisMoves.turnMoveInfo(move);

                    // abundance of caution. right now the AxisDisk constants match our disk indices, but in the future, who knows
                    var diskIndex = AxisVisualizer.diskTypeToInternalDiskIndex(turnInfo.disk);

                    // NOTE: calling this through the visualizer will add the move to the history, as if a UI action
                    ( (turnInfo.isCW ? this.turnCW : this.turnCCW).bind(this) )( diskIndex );
                } else {
                    this.history.push(move);
                    for (var disk of this.disks.disks) {
                        disk.move(move);
                    }
                }
            }
            this.draw();
        }
    }

    setParkedState() {
        this.parkedHistory = this.serializeState();
    }

    restoreParkedState(givenState) {
        var restore = (givenState ? givenState : this.parkedHistory);
        if (restore && restore !== this.serializeState()) {
            var diskStates = AxisMoves.unserialize(restore);
            for (var i = 0; i < diskStates.length; ++i) {
                this.disks.disks[i].moveToAbsolutePosition(diskStates[i]);
            }
            this.history.push(restore);
        }
    }

    nextStep() {
        var fullMovement = (this.isPartialMove ? AxisMoves.createPartialMove(this.currentMovement) : this.currentMovement);

        if (this.step < AxisVisualizer.MAX_STEP) {
            this.step += (!AxisVisualizer.automatic ? AxisVisualizer.MANUAL_STEP_INC : 1);
            // moving manually, then automatically (in fast mode) can possibly exceed 100.
            this.step = Math.min(this.step, AxisVisualizer.MAX_STEP);

            this.rotateDisksAndMoveKnobDuringStep(fullMovement);
        } else {
            this.step = this.x = this.y = 0;
            this.knobInterfacePlate.moveToAbsoluteIndex(this.x, this.y);

            this.history.push(fullMovement);
            // TODO: figure out a different display
            if (this.showPartialMoves) {
                console.log(Object.keys(this._statesVisited));
            }
            this._statesVisited = {};
            for (var disk of this.disks.disks) {
                disk.move(fullMovement);
            }

            this.currentMovement = AxisMoves.MOVE_UNAFFECTED;
            this.isPartialMove = false;
        }
    }

	previousStep() {
        var fullMovement = (this.isPartialMove ? AxisMoves.createPartialMove(this.currentMovement) : this.currentMovement);

		if (this.step > 0) {
            this.step -= (!AxisVisualizer.automatic ? AxisVisualizer.MANUAL_STEP_INC : 1);
            this.step = Math.max(this.step, 0);

            this.rotateDisksAndMoveKnobDuringStep(fullMovement);
		} else {
            this.currentMovement = AxisMoves.MOVE_UNAFFECTED;
        }
	}

    rotateDisksAndMoveKnobDuringStep(fullMovement) {
        var indices = [];
        for (var disk of this.disks.disks) {
            disk.rotateToIncrementalAngle( disk.controlCurveAngle(fullMovement, this.step) );
            if (this.showPartialMoves) {
                indices.push(disk.approximateIndexAtCurrentAngle());
            }
        }

        if (this.showPartialMoves) {
            var combo = AxisStates.GetCombination(AxisStates.State2StateNumber.apply(null, indices));
            if (combo !== AxisStates.INVALID_STATE_TEXT && typeof this._statesVisited[combo] === 'undefined') {
                this._statesVisited[combo] = true;
            }
        }

        switch (this.currentMovement)
        {
            case AxisMoves.MOVE_UP:
                this.y = -this.step;
                if (this.y < -AxisVisualizer.MAX_STEP/2) {this.y = -AxisVisualizer.MAX_STEP - this.y;}
                break;
            case AxisMoves.MOVE_DOWN:
                this.y = this.step;
                if (this.y > AxisVisualizer.MAX_STEP/2) {this.y = AxisVisualizer.MAX_STEP - this.y;}
                break;
            case AxisMoves.MOVE_LEFT:
                this.x = -this.step;
                if (this.x < -AxisVisualizer.MAX_STEP/2) {this.x = -AxisVisualizer.MAX_STEP - this.x;}
                break;
            case AxisMoves.MOVE_RIGHT:
                this.x = this.step;
                if (this.x > AxisVisualizer.MAX_STEP/2) {this.x = AxisVisualizer.MAX_STEP - this.x;}
                break;
        }

        if (this.isPartialMove) {
            this.x *= AxisDisk.PARTIAL_MOVE_RATIO;
            this.y *= AxisDisk.PARTIAL_MOVE_RATIO;
        }

        this.knobInterfacePlate.moveToAbsoluteIndex(this.x, this.y);
    }

	turnCCW(diskIndex) {
		this.disks.disks[diskIndex].turnCCW();

        var disk = AxisVisualizer.internalDiskIndexToDiskType(diskIndex);
        this.history.push(AxisMoves.createDiskTurnMove(disk, false));
	}

	turnCW(diskIndex) {
		this.disks.disks[diskIndex].turnCW();

        var disk = AxisVisualizer.internalDiskIndexToDiskType(diskIndex);
        this.history.push(AxisMoves.createDiskTurnMove(disk, true));
	}

	setGates() {
        if (!this.lockedGatePositions) {
            for (var disk of this.disks.disks) {
                disk.setGateToCurrentPosition();
            }
        }
	}

    setCurrentDiskGate() {
        if (!this.lockedGatePositions) {
            this.disks.disks[AxisVisualizer.selectedDisk].setGateToCurrentPosition();
        }
    }

	toggleGatesVisibility() {
        for (var disk of this.disks.disks) {
            disk.toggleGateVisibility();
        }
	}

	setMarker() {
        this.disks.disks[AxisVisualizer.selectedDisk].setMarkerToCurrentPosition( AxisColorSelector.COLOR_SELECTION[AxisColorSelector.currentColorIndex] );
	}

    clearAllMarkers() {
        for (var disk of this.disks.disks) {
            disk.clearAllMarkers();
        }
    }

    deleteMarker() {
        this.disks.disks[AxisVisualizer.selectedDisk].deleteMarker();
    }

    toggleCutawayColoringVisibility() {
        for (var disk of this.disks.disks) {
            disk.toggleCutawayColoringVisibility();
        }
	}

    toggleCutawayType() {
        for (var disk of this.disks.disks) {
            disk.toggleCutawayType();
        }
    }

    setGatesWithCurrentCutawayPositionOnReset() {
        if (!this.lockedGatePositions) {
            for (var disk of this.disks.disks) {
                disk.setGateWithCurrentCutawayPositionOnReset();
            }
        }
    }

    setGateWithCurrentCutawayPositionOnReset() {
        if (!this.lockedGatePositions) {
            this.disks.disks[AxisVisualizer.selectedDisk].setGateWithCurrentCutawayPositionOnReset();
        }
    }

    toggleBooleanOption(option) {
        this[option] = !this[option];
    }

    serializeState() {
        for (var i = 0, result = 0; i < this.disks.disks.length; ++i) {
            result *= 15;
            result += this.disks.disks[i].getAbsolutePosition();
        }
        return result;
    }

    touchableElementAt(coords) {
        // disk layer uses canvas of different size, we need to translate accordingly.
        for (var disk of this.disks.disks) {
            var effectiveX = disk.x + (AxisVisualizer.centerX-1 - AxisDisk.ACTIVE_DISK_AREA_WIDTH/2);
            var effectiveY = disk.y + (AxisVisualizer.centerY-1 - AxisDisk.ACTIVE_DISK_AREA_WIDTH/2);
            if (Math.sqrt(Math.pow(effectiveX - coords.x, 2) + Math.pow(effectiveY - coords.y, 2)) < AxisDisk.radius) {
                return { type: 'disk', disk: disk.internalDiskNumber};
            }
        }

        // TODO: REWRITE ANYTHING BELOW THIS (PROOF OF CONCEPT)
        if (coords.x <= AxisVisualizer.centerX && coords.y <= 100) {
            return { type: 'reset' };
        }

        for (const command of AxisUI.instructionPages[this.selectedUIPage].commands) {
            if (command.bounds[0][0] <= coords.x && coords.x <= command.bounds[1][0] && command.bounds[0][1] <= coords.y && coords.y < command.bounds[1][1]) {
                // iff the first <key> given is a single character, we'll return that, otherwise assume the command is too complex for a single tap
                var firstGivenKey = command[1].match(/<(.*?)>/);
                return { type: 'instructionPage', key: (firstGivenKey && firstGivenKey[1].length === 1 ? firstGivenKey[1] : null) };
            }
        }

        return null;
	}
}
//statics

// we're measuring everything against the background image now.
// background image: 1222x900
// disk display "working area": 776w x 900h
// for future reference: there was a global scale of 0.78, refactored out
AxisVisualizer.centerX = 419; // abs. guessed center of disk imagery: (419, 449)
AxisVisualizer.centerY = 449;
AxisVisualizer.FONT_SIZES = {
    'title': 42,
    'adaptationNotice': 13,
    'moveStateReminder': 19,
    'disclaimer': 10,
    'instruction': 26,
    'instructionExplanation': 20,
    'OSLPromotion': 26,
    'copyright': 18
};

AxisVisualizer.ANIMATION_TIMES = { 'slow': 900, 'normal': 500, 'instant': 1 }; // milliseconds. let instant > 0 because we use SetTimeout() later on.
AxisVisualizer.AUTOMATIC_ANIMATION_TIME = AxisVisualizer.ANIMATION_TIMES.normal;
AxisVisualizer.MAX_STEP = 100;
AxisVisualizer.MANUAL_STEP_INC = 5;
AxisVisualizer.automatic = true;
AxisVisualizer.startManualMove = 8;
AxisVisualizer.endManualMove = 92;

AxisVisualizer.selectedDisk = undefined;

AxisVisualizer.internalDiskIndexToDiskType = function(index) {
    switch(index) {
        case 0: return AxisDisk.DISK_TOP; break;
        case 1: return AxisDisk.DISK_LEFT; break;
        case 2: return AxisDisk.DISK_BOTTOM; break;
        case 3: return AxisDisk.DISK_RIGHT; break;
        default: return undefined;
    }
};
AxisVisualizer.diskTypeToInternalDiskIndex = function(type) {
    switch(type) {
        case AxisDisk.DISK_TOP:     return 0; break;
        case AxisDisk.DISK_LEFT:    return 1; break;
        case AxisDisk.DISK_BOTTOM:  return 2; break;
        case AxisDisk.DISK_RIGHT:   return 3; break;
        default:                    return undefined; break;
    }
};