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

        var diskLayer = canvas.cloneNode(false);
        this.disks = {
            layer: diskLayer,
            disks: [
                new AxisDisk(diskLayer, document.getElementById("disk"), 0, AxisDisk.DISK_TOP, AxisVisualizer.centerX, AxisVisualizer.centerY),
                new AxisDisk(diskLayer, document.getElementById("disk"), 90, AxisDisk.DISK_LEFT, AxisVisualizer.centerX, AxisVisualizer.centerY),
                new AxisDisk(diskLayer, document.getElementById("disk"), 180, AxisDisk.DISK_BOTTOM, AxisVisualizer.centerX, AxisVisualizer.centerY),
                new AxisDisk(diskLayer, document.getElementById("disk"), 270, AxisDisk.DISK_RIGHT, AxisVisualizer.centerX, AxisVisualizer.centerY)
            ],
            draw: function(){
                // TODO: change drawing subsystem, but for now just copy what's actually relevant
                var estimatedWidth = AxisVisualizer.activeDiskAreaWidth;
                this.layer.getContext('2d').clearRect(AxisVisualizer.centerX - estimatedWidth/2, AxisVisualizer.centerY - estimatedWidth/2, estimatedWidth, estimatedWidth);
                for (var a of this.disks) {
                    a.draw();
                }
                canvas.getContext('2d').drawImage(
                    this.layer,
                    AxisVisualizer.centerX - estimatedWidth/2, AxisVisualizer.centerY - estimatedWidth/2, estimatedWidth, estimatedWidth,
                    AxisVisualizer.centerX - estimatedWidth/2, AxisVisualizer.centerY - estimatedWidth/2, estimatedWidth, estimatedWidth
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
            return currentOptions.showCurrentCombination || // current combination is in "active area" for disks
                   !visualizerRef.prevOptions ||
                   (visualizerRef.prevOptions.page !== visualizerRef.selectedUIPage) ||
                   (visualizerRef.prevOptions.options !== JSON.stringify(currentOptions));
        };
        this.dynamicUI.generateOptions = function() {
            var uiPage = visualizerRef.selectedUIPage;
            var options = {
                showShortenedMoves: visualizerRef.showShortenedMoves,
                shortenedMoves: AxisStates.GetCombination( AxisStates.State2StateNumber.apply(null, visualizerRef.disks.disks.map(o => o.index)) ),
                rawMoveDisplay: visualizerRef.rawMoveDisplay,
                showCurrentCombination: visualizerRef.showCurrentCombination,
                currentCombination: AxisStates.GetCombination( AxisStates.State2StateNumber.apply(null, visualizerRef.disks.disks.map(o => o.gate.index)) )
            };
            if (options.rawMoveDisplay) {
                options.history = visualizerRef.history;
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
        this.showShortenedMoves = true;
        this.showCurrentCombination = false;
        this.rawMoveDisplay = false;
        this.lockedGatePositions = false;
        this.reset();
    }

    draw() {
        if (this.dynamicUI.willRedraw()) {
            this.ctx.drawImage(this.staticLayer, 0, 0);
        } else {
            var estimatedWidth = AxisVisualizer.activeDiskAreaWidth;
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

        if (!this.history.length || this.history[this.history.length-1] !== AxisDisk.MOVE_UNAFFECTED) {
            this.history.push(AxisDisk.MOVE_UNAFFECTED);
        }
        this.currentMovement = AxisDisk.MOVE_UNAFFECTED;

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
        var expectedSteps = Math.floor( (elapsed/AxisVisualizer.AUTOMATIC_ANIMATION_TIME) * AxisVisualizer.MAX_STEP );
        var shouldRepaint = (this.animationStats.totalSteps < expectedSteps);
        while (this.animationStats.totalSteps < expectedSteps) {
            // when beyond the max step, move is changed to MOVE_UNAFFECTED and attemping to step forward will cause an error.
            if (this.currentMovement !== AxisDisk.MOVE_UNAFFECTED) {
                this.nextStep();
            }
            ++this.animationStats.totalSteps;
        }
        if (shouldRepaint) {
            this.draw();
        }

        if (this.currentMovement !== AxisDisk.MOVE_UNAFFECTED) {
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
            var lastReset = this.history.lastIndexOf(AxisDisk.MOVE_UNAFFECTED, (this.history[this.history.length-1] === AxisDisk.MOVE_UNAFFECTED ? this.history.length-2 : Infinity));
            var replayMoves = this.history.splice(lastReset);
            replayMoves.pop();
            for (var move of replayMoves) {
                if (move === AxisDisk.MOVE_UNAFFECTED) {
                    this.reset();
                } else if (AxisVisualizer.isSerializedState(move)) {
                    this.restoreParkedState(move);
                } else if (AxisVisualizer.isDiskTurnMove(move)) {
                    // individual disk rotation move.
                    var turnInfo = AxisVisualizer.turnMoveInfo(move);

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
            var diskStates = AxisVisualizer.unserialize(restore);
            for (var i = 0; i < diskStates.length; ++i) {
                this.disks.disks[i].moveToAbsolutePosition(diskStates[i]);
            }
            this.history.push(restore);
        }
    }

    nextStep() {
        var fullMovement = (this.isPartialMove ? AxisDisk.makePartialMove(this.currentMovement) : this.currentMovement);

        if (this.step < AxisVisualizer.MAX_STEP) {
            this.step += (!AxisVisualizer.automatic ? AxisVisualizer.MANUAL_STEP_INC : 1);
            // moving manually, then automatically (in fast mode) can possibly exceed 100.
            this.step = Math.min(this.step, AxisVisualizer.MAX_STEP);

            this.rotateDisksAndMoveKnobDuringStep(fullMovement);
        } else {
            this.step = this.x = this.y = 0;
            this.knobInterfacePlate.moveToAbsoluteIndex(this.x, this.y);

            this.history.push(fullMovement);
            for (var disk of this.disks.disks) {
                disk.move(fullMovement);
            }

            this.currentMovement = AxisDisk.MOVE_UNAFFECTED;
            this.isPartialMove = false;
        }
    }

	previousStep() {
        var fullMovement = (this.isPartialMove ? AxisDisk.makePartialMove(this.currentMovement) : this.currentMovement);

		if (this.step > 0) {
            this.step -= (!AxisVisualizer.automatic ? AxisVisualizer.MANUAL_STEP_INC : 1);
            this.step = Math.max(this.step, 0);

            this.rotateDisksAndMoveKnobDuringStep(fullMovement);
		} else {
            this.currentMovement = AxisDisk.MOVE_UNAFFECTED;
        }
	}

    rotateDisksAndMoveKnobDuringStep(fullMovement) {
        for (var disk of this.disks.disks) {
            disk.rotateToIncrementalAngle( disk.controlCurveAngle(fullMovement, this.step) );
        }

        switch (this.currentMovement)
        {
            case AxisDisk.MOVE_UP:
                this.y = -this.step;
                if (this.y < -AxisVisualizer.MAX_STEP/2) {this.y = -AxisVisualizer.MAX_STEP - this.y;}
                break;
            case AxisDisk.MOVE_DOWN:
                this.y = this.step;
                if (this.y > AxisVisualizer.MAX_STEP/2) {this.y = AxisVisualizer.MAX_STEP - this.y;}
                break;
            case AxisDisk.MOVE_LEFT:
                this.x = -this.step;
                if (this.x < -AxisVisualizer.MAX_STEP/2) {this.x = -AxisVisualizer.MAX_STEP - this.x;}
                break;
            case AxisDisk.MOVE_RIGHT:
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
        this.history.push(AxisVisualizer.createDiskTurnMove(disk, false));
	}

	turnCW(diskIndex) {
		this.disks.disks[diskIndex].turnCW();

        var disk = AxisVisualizer.internalDiskIndexToDiskType(diskIndex);
        this.history.push(AxisVisualizer.createDiskTurnMove(disk, true));
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

    toggleRawMoveDisplay() {
        this.rawMoveDisplay = !this.rawMoveDisplay;
    }

    toggleLockedGatePositions() {
        this.lockedGatePositions = !this.lockedGatePositions;
    }

    toggleShortenedMoveDisplay() {
        this.showShortenedMoves = !this.showShortenedMoves;
    }

    toggleCurrentCombinationDisplay() {
        this.showCurrentCombination = !this.showCurrentCombination;
    }

    serializeState() {
        for (var i = 0, result = 0; i < this.disks.disks.length; ++i) {
            result *= 15;
            result += this.disks.disks[i].getAbsolutePosition();
        }
        return result;
    }

    touchableElementAt(coords) {
        for (var disk of this.disks.disks) {
            if (Math.sqrt(Math.pow(disk.x - coords.x, 2) + Math.pow(disk.y - coords.y, 2)) < AxisDisk.radius) {
                return { type: 'disk', disk: disk.internalDiskNumber};
            }
        }

        // TODO: REWRITE ANYTHING BELOW THIS (PROOF OF CONCEPT)
        //check if instruction page
        if (796 <= coords.x && coords.x <= 1200 && 158 <= coords.y && coords.y < 740) {
            return { type: 'instructionPage' };
        }
        if (coords.x <= AxisVisualizer.centerX && coords.y <= 100) {
            return { type: 'reset' };
        }
        //check within instruction page?
        //check if marker color?

        return null;
	}
}
//statics

// we're measuring everything against the background image now.
// background image: 1222x900
// disk display "working area": 776w x 900h
AxisVisualizer.scale = 0.78; // empirical, original was 0.69
AxisVisualizer.centerX = 419; // abs. guessed center of disk imagery: (419, 449)
AxisVisualizer.centerY = 449;
AxisVisualizer.activeDiskAreaWidth = 640;
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

AxisVisualizer.DISK_TOP_TURN = 16;
AxisVisualizer.DISK_LEFT_TURN = AxisVisualizer.DISK_TOP_TURN + 2;
AxisVisualizer.DISK_BOTTOM_TURN = AxisVisualizer.DISK_TOP_TURN + 4;
AxisVisualizer.DISK_RIGHT_TURN = AxisVisualizer.DISK_TOP_TURN + 6;
AxisVisualizer.isDiskTurnMove = function(move) {
    return (AxisVisualizer.DISK_TOP_TURN <= move) && (move <= AxisVisualizer.DISK_RIGHT_TURN + 1);
};
AxisVisualizer.createDiskTurnMove = function(disk, isCW) {
    switch(disk) {
        case AxisDisk.DISK_TOP:     var base = AxisVisualizer.DISK_TOP_TURN; break;
        case AxisDisk.DISK_LEFT:    var base = AxisVisualizer.DISK_LEFT_TURN; break;
        case AxisDisk.DISK_BOTTOM:  var base = AxisVisualizer.DISK_BOTTOM_TURN; break;
        case AxisDisk.DISK_RIGHT:   var base = AxisVisualizer.DISK_RIGHT_TURN; break;
        default: break;
    }
    return base + (isCW ? 0 : 1);
};
AxisVisualizer.turnMoveInfo = function(move) {
    return {
        disk: [AxisDisk.DISK_TOP, AxisDisk.DISK_LEFT, AxisDisk.DISK_BOTTOM, AxisDisk.DISK_RIGHT][ ((move ^ (move & 1)) - AxisVisualizer.DISK_TOP_TURN)/2 ],
        isCW: (move % 2 === 0)
    }
};

AxisVisualizer.SERIALIZED_BASE = 32;
AxisVisualizer.SERIALIZED_MAX = AxisVisualizer.SERIALIZED_BASE + 50624; // (15^3*14 + 15^2*14 + 15*14 + 14)
AxisVisualizer.isSerializedState = function(state) {
    return AxisVisualizer.SERIALIZED_BASE <= state && state <= AxisVisualizer.SERIALIZED_MAX;
};
AxisVisualizer.unserialize = function(state) {
    for (var i = 0, result = []; i < 4; ++i) {
        result.unshift(state % 15);
        state = Math.floor(state / 15);
    }
    return result;
};

AxisVisualizer.textRepresentationOfMove = function(move) {
    if (AxisVisualizer.isDiskTurnMove(move)) {
        return (move % 2 === 0 ? "\u2938" : "\u2939") + 'ULDR'.charAt(Math.floor((move % AxisVisualizer.DISK_TOP_TURN) / 2));
    } else if (AxisVisualizer.isSerializedState(move)) {
        return 'p';
    } else {
        return '0ULDR#uldr'.charAt(move) || '#';
    }
}

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