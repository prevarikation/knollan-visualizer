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
            new AxisBackground(this.staticLayer),
            new AxisGateTestingPiece(this.staticLayer, document.getElementById("gate-tester"), AxisVisualizer.centerX, AxisVisualizer.centerY)
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
                this.layer.getContext('2d').clearRect(0, 0, this.layer.width, this.layer.height);
                for (var a of this.disks) {
                    a.draw();
                }
                canvas.getContext('2d').drawImage(this.layer, 0, 0);
            }
        };
        this.selectDisk(AxisDisk.DISK_TOP);

        this.knobInterfacePlate = new AxisKnobInterfacePlate(canvas, document.getElementById("knob-interface"), AxisVisualizer.centerX, AxisVisualizer.centerY);

        this.dynamic = [
            this.disks,
            this.knobInterfacePlate,
            { // speed indicator box
                draw: function() {
                    this.ctx.save();

                    // all measurements empirical
                    var boundingRect = null;
                    switch(AxisVisualizer.AUTOMATIC_ANIMATION_TIME) {
                        case AxisVisualizer.ANIMATION_TIMES.slow:       boundingRect = { offsetX: 73, width: 47}; break;
                        case AxisVisualizer.ANIMATION_TIMES.instant:    boundingRect = { offsetX: 124, width: 66}; break;
                        default:                                        boundingRect = { offsetX: 0, width: 70}; break;
                    }

                    // based off AxisBackground.js
                    var speedTextBackground = { fontSize: 20, originX: 975, originY: 333 };
                    this.ctx.strokeStyle = '#2429bc';
                    this.ctx.strokeRect(
                        speedTextBackground.originX + boundingRect.offsetX - speedTextBackground.fontSize/4,
                        speedTextBackground.originY - speedTextBackground.fontSize,
                        boundingRect.width,
                        speedTextBackground.fontSize * 5/4);

                    this.ctx.restore();
                }.bind(this)
            },
            { // combination text
                draw: function() {
                    var combination = AxisStates.GetCombination( AxisStates.State2StateNumber.apply(null, this.disks.disks.map(o => o.index)) );
                    var extendedNicerFormat  = AxisStates.GetNicerCombinationFormat2(combination);
                    var condensedNicerFormat = AxisStates.GetNicerCombinationFormat(combination);
                    this.ctx.save();
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'top';

                    // extended
                    this.ctx.font = '32px sans-serif';
                    this.ctx.fillText(extendedNicerFormat, AxisVisualizer.centerX, AxisVisualizer.centerY + document.getElementById("knob-interface").height/2 + 45);
                    // condensed
                    this.ctx.font = '20px sans-serif';
                    this.ctx.fillText(condensedNicerFormat, AxisVisualizer.centerX, AxisVisualizer.centerY + document.getElementById("knob-interface").height/2 + 45 + 32);

                    this.ctx.restore();
                }.bind(this)
            }
        ];

        this.movingAutomatically = false;
        this.animationStats = null;
        this.history = [];
        this.reset();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.drawImage(this.staticLayer, 0, 0);
        for (var layer of this.dynamic) {
            layer.draw();
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
        this.dynamic[1].reset();
    }

    animate(movement) {
        if (typeof movement !== 'undefined') {
            this.currentMovement = movement;
        };

        if (this.animationStats === null) {
            this.animationStats = {
                start: new Date(),
                totalSteps: 0
            };
        }

        var elapsed = new Date() - this.animationStats.start;
        var expectedSteps = Math.floor( (elapsed/AxisVisualizer.AUTOMATIC_ANIMATION_TIME) * (AxisVisualizer.MAX_STEP/AxisVisualizer.STEP_INC) );
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
            setTimeout(this.animate.bind(this), 25);
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

    startMovement(direction, automatic) {
        if (automatic) {
            if (this.movingAutomatically) {
                return;
            } else {
                this.movingAutomatically = true;
            }
        }

        this.currentMovement = direction;
        AxisVisualizer.automatic = automatic;

        if (AxisVisualizer.automatic) {
            this.animate(this.currentMovement);
        } else {
            this.nextStep();
        }
    }

    undoLastMovement() {
        /* going back to last reset and replaying moves seems like the easiest way to get correct disk positions. */
        /* TODO: animate reversal. */
        if (this.history.length > 1) {
            var lastReset = this.history.lastIndexOf(AxisDisk.MOVE_UNAFFECTED, (this.history[this.history.length-1] === AxisDisk.MOVE_UNAFFECTED ? this.history.length-2 : Infinity));
            var replayMoves = this.history.splice(lastReset);
            replayMoves.pop();
            for (var move of replayMoves) {
                if (move === AxisDisk.MOVE_UNAFFECTED) {
                    this.reset();
                } else if (AxisVisualizer.isDiskTurnMove(move)) {
                    // individual disk rotation move.
                    var turnInfo = AxisVisualizer.turnMoveInfo(move);

                    // abundance of caution. right now the AxisDisk constants match our disk indices, but in the future, who knows
                    // TODO: have function for internal <-> external disk identifier.
                    switch(turnInfo.disk) {
                        case AxisDisk.DISK_TOP:     var diskIndex = 0; break;
                        case AxisDisk.DISK_LEFT:    var diskIndex = 1; break;
                        case AxisDisk.DISK_BOTTOM:  var diskIndex = 2; break;
                        case AxisDisk.DISK_RIGHT:   var diskIndex = 3; break;
                        default: break;
                    }

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
        // we don't skip over the reset state here, as was done above.
        var lastReset = this.history.lastIndexOf(AxisDisk.MOVE_UNAFFECTED);
        this.parkedHistory = this.history.slice(lastReset);
    }

    restoreParkedState() {
        if (this.parkedHistory) {
            // hacky. we append the parked state to the history, add a sacrificial move, then undoLastMove()
            // TODO: don't pollute history. unparking should be an atomic move.
            this.history = this.history.concat(this.parkedHistory, [AxisDisk.MOVE_UP]);
            this.undoLastMovement();
        }
    }

    nextStep() {
        if (this.step < AxisVisualizer.MAX_STEP) {
            this.step += (!AxisVisualizer.automatic ? 5 : AxisVisualizer.STEP_INC);
            // moving manually, then automatically (in fast mode) can possibly exceed 100.
            this.step = Math.min(this.step, 100);

            for (var disk of this.disks.disks) {
                disk.rotateToIncrementalAngle( disk.controlCurveAngle(this.currentMovement, this.step) );
            }

            switch(this.currentMovement) {
				case AxisDisk.MOVE_UP:
					this.y = -this.step;
					if (this.y < -AxisVisualizer.MAX_STEP/2) { this.y = -AxisVisualizer.MAX_STEP - this.y; }
					break;
				case AxisDisk.MOVE_DOWN:
					this.y = this.step;
					if (this.y > AxisVisualizer.MAX_STEP/2) { this.y = AxisVisualizer.MAX_STEP - this.y; }
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

            this.knobInterfacePlate.moveToAbsoluteIndex(this.x, this.y);
        } else {
            this.step = this.x = this.y = 0;
            this.knobInterfacePlate.moveToAbsoluteIndex(this.x, this.y);

            this.history.push(this.currentMovement);
            for (var disk of this.disks.disks) {
                disk.move(this.currentMovement);
            }

            this.currentMovement = AxisDisk.MOVE_UNAFFECTED;
        }
    }

	previousStep() {
		if (this.step > 0) {
            this.step -= (!AxisVisualizer.automatic ? 5 : AxisVisualizer.STEP_INC);
            this.step = Math.max(this.step, 0);

            for (var disk of this.disks.disks) {
                disk.rotateToIncrementalAngle( disk.controlCurveAngle(this.currentMovement, this.step) );
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

			this.knobInterfacePlate.moveToAbsoluteIndex(this.x, this.y);
		} else {
            this.currentMovement = AxisDisk.MOVE_UNAFFECTED;
        }
	}

	turnCCW(diskIndex) {
		this.disks.disks[diskIndex].turnCCW();

        // TODO: we should really have a function to translate the visualizer's internal disk numbers to their "absolute" disk identifiers.
        switch(diskIndex) {
            case 0: var disk = AxisDisk.DISK_TOP; break;
            case 1: var disk = AxisDisk.DISK_LEFT; break;
            case 2: var disk = AxisDisk.DISK_BOTTOM; break;
            case 3: var disk = AxisDisk.DISK_RIGHT; break;
            default: break;
        }
        this.history.push(AxisVisualizer.createDiskTurnMove(disk, false));
	}

	turnCW(diskIndex) {
		this.disks.disks[diskIndex].turnCW();

        switch(diskIndex) {
            case 0: var disk = AxisDisk.DISK_TOP; break;
            case 1: var disk = AxisDisk.DISK_LEFT; break;
            case 2: var disk = AxisDisk.DISK_BOTTOM; break;
            case 3: var disk = AxisDisk.DISK_RIGHT; break;
            default: break;
        }
        this.history.push(AxisVisualizer.createDiskTurnMove(disk, true));
	}

	setGates() {
        for (var disk of this.disks.disks) {
            disk.setGateToCurrentPosition();
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

    deleteLastMarker() {
        this.disks.disks[AxisVisualizer.selectedDisk].deleteLastMarker();
    }
}
//statics

// we're measuring everything against the background image now.
// background image: 1222x900
// disk display "working area": 776w x 900h
AxisVisualizer.scale = 0.78; // empirical, original was 0.69
AxisVisualizer.diskScale = 1; // empirical, original 50
AxisVisualizer.centerX = 419; // abs. guessed center of disk imagery: (419, 449)
AxisVisualizer.centerY = 449;

AxisVisualizer.ANIMATION_TIMES = { 'slow': 900, 'normal': 500, 'instant': 1 }; // milliseconds. let instant > 0 because we use SetTimeout() later on.
AxisVisualizer.AUTOMATIC_ANIMATION_TIME = AxisVisualizer.ANIMATION_TIMES.normal;
AxisVisualizer.MAX_STEP = 100;
AxisVisualizer.STEP_INC = 1; // previously used to control animation speed
AxisVisualizer.automatic = true;
AxisVisualizer.startManualMove = 8;
AxisVisualizer.endManualMove = 92;

AxisVisualizer.selectedDisk = undefined;

AxisVisualizer.DISK_TOP_TURN = 64;
AxisVisualizer.DISK_LEFT_TURN = 66;
AxisVisualizer.DISK_BOTTOM_TURN = 68;
AxisVisualizer.DISK_RIGHT_TURN = 70;
AxisVisualizer.isDiskTurnMove = function(move) {
    return (AxisVisualizer.DISK_TOP_TURN <= move) && (move <= AxisVisualizer.DISK_RIGHT_TURN + 1);
}
AxisVisualizer.createDiskTurnMove = function(disk, isCW) {
    switch(disk) {
        case AxisDisk.DISK_TOP:     var base = AxisVisualizer.DISK_TOP_TURN; break;
        case AxisDisk.DISK_LEFT:    var base = AxisVisualizer.DISK_LEFT_TURN; break;
        case AxisDisk.DISK_BOTTOM:  var base = AxisVisualizer.DISK_BOTTOM_TURN; break;
        case AxisDisk.DISK_RIGHT:   var base = AxisVisualizer.DISK_RIGHT_TURN; break;
        default: break;
    }
    return base + (isCW ? 0 : 1);
}
AxisVisualizer.turnMoveInfo = function(move) {
    return {
        disk: [AxisDisk.DISK_TOP, AxisDisk.DISK_LEFT, AxisDisk.DISK_BOTTOM, AxisDisk.DISK_RIGHT][ ((move ^ (move & 1)) - AxisVisualizer.DISK_TOP_TURN)/2 ],
        isCW: (move % 2 === 0)
    }
}
