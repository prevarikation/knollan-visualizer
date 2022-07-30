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

class AxisDisk
{
    constructor(canvas, image, diskStartAngle, diskUniqueNumber, centerX, centerY) {
		AxisDisk.radius = image.width/2 * AxisDisk.SCALE;
		AxisDisk.centerX = canvas.width/2; //empirical tweaks for better visual coherency
		AxisDisk.centerY = canvas.height/2;

        this.index = new AxisIndex();
        this.gate = {
            visible: true,
            index: new AxisIndex(0, 0)
        };
		this.markers = [];
        this.colorSelector = new AxisColorSelector(canvas);
		this.cutawayType = AxisDisk.CUTAWAY_BLANK_REG;
		this.cutawayColoringVisible = false;
		this.startAngle = diskStartAngle;
		this.internalDiskNumber = diskUniqueNumber;
		this.reset();

        this.canvas = canvas;
        this.image = image;

		switch (this.internalDiskNumber)
		{
            // coordinates (x, y) given as center of rotation for disk.
			case AxisDisk.DISK_TOP:
				this.x = AxisDisk.centerX;
				this.y = AxisDisk.centerY - AxisDisk.distanceY + AxisDisk.radius;
                // label positions are relative to the center of disk
				this.labelX = (AxisDisk.radius + 8) * Math.cos(120 * Math.PI/180);
				this.labelY = -1 * (AxisDisk.radius + 12) * Math.sin(120 * Math.PI/180);
				break;
			case AxisDisk.DISK_LEFT:
				this.x = AxisDisk.centerX - AxisDisk.distanceX + AxisDisk.radius;
				this.y = AxisDisk.centerY;
				this.labelX = (AxisDisk.radius + 8) * Math.cos(120 * Math.PI/180);
				this.labelY = -1 * (AxisDisk.radius + 12) * Math.sin(120 * Math.PI/180);
				break;
			case AxisDisk.DISK_BOTTOM:
				this.x = AxisDisk.centerX;
				this.y = AxisDisk.centerY + AxisDisk.distanceY - AxisDisk.radius;
				this.labelX = (AxisDisk.radius + 8) * Math.cos(120 * Math.PI/180);
				this.labelY = (AxisDisk.radius + 12) * Math.sin(120 * Math.PI/180);
				break;
			case AxisDisk.DISK_RIGHT:
				this.x = AxisDisk.centerX + AxisDisk.distanceX - AxisDisk.radius;
				this.y = AxisDisk.centerY;
				this.labelX = (AxisDisk.radius + 8) * Math.cos(60 * Math.PI/180);
				this.labelY = -1 * (AxisDisk.radius + 12) * Math.sin(60 * Math.PI/180);
				break;
		}
    }
	
    reset() {
        this.index.N = this.index.M = 0;
        this.index2Angle();
    }

    draw() {
        var ctx = this.canvas.getContext('2d');
        ctx.save();

        ctx.translate(this.x, this.y);

        // draw label before rotation
        ctx.font = AxisDisk.fontSizePx + 'px sans-serif';
        ctx.textAlign = (this.internalDiskNumber === AxisDisk.DISK_RIGHT ? 'left' : 'right');
        if (this.internalDiskNumber === AxisDisk.DISK_BOTTOM) {
            ctx.textBaseline = 'top';
        }
        var combinationText = "[" + this.index.N + "," + (this.index.M === 1 ? "+" : (this.index.M === 0 ? " " : "")) + this.index.M + "]";
        ctx.fillText(combinationText, this.labelX, this.labelY);

        // color selector
        var textMeasurements = ctx.measureText(combinationText);
        // TODO: make this an actual
        this.colorSelector.setCoordinates(
            this.labelX - (this.internalDiskNumber === AxisDisk.DISK_RIGHT ? -1 : 1) * (textMeasurements.width + AxisColorSelector.width/2 + 5),
            this.labelY + (this.internalDiskNumber === AxisDisk.DISK_BOTTOM ? textMeasurements.actualBoundingBoxDescent/2 : -textMeasurements.actualBoundingBoxAscent/2)
        );
        if (this.colorSelector.visible) {
            this.colorSelector.draw();
        }

        // draw disk image
        // because we rotate everything here, gates and markers can be drawn without dealing without offset/single step
		this._rotation = -(this.startAngle + this.offsetAngle + this.singleStepAngle);
        ctx.rotate(this._rotation * Math.PI/180);
        ctx.drawImage(this.image, -AxisDisk.radius, -AxisDisk.radius, AxisDisk.SCALE * this.image.width, AxisDisk.SCALE * this.image.height);

        // draw gate
        // TODO: fix something. we had to negate this line (relative to below,) when it shouldn't have been necessary.
		this.gate._rotation = (72 * this.gate.index.N + 24 * this.gate.index.M);
        if (this.gate.visible) {
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#00f8';
            ctx.arc(AxisDisk.radius * Math.sin(this.gate._rotation * Math.PI/180), -(AxisDisk.radius * Math.cos(this.gate._rotation * Math.PI/180)), 15, 0, 2*Math.PI);
            ctx.stroke();
        }

        // draw markers
        for (var marker of this.markers) {
            var markerAngle = -(72 * marker.index.N + 24 * marker.index.M);
            ctx.beginPath();
            ctx.lineWidth = 8;
            ctx.strokeStyle = marker.color;
            // matches (N, M) coordinates like those for rotations, gates etc.
            ctx.arc(0, 0, AxisDisk.radius, (-78 - markerAngle)*Math.PI/180, (-78 - (markerAngle + 24))*Math.PI/180, true);
            ctx.stroke();
        }

		// TODO: where does this belong?
		// TODO: contact Blank_Reg to finalize colors and adjustments based on his cutaways :D
		if (this.cutawayColoringVisible) {
			// straighten out canvas
			ctx.rotate(-this._rotation * Math.PI/180);
			// color-coded disks peek into windows from different corners for each disk,
			// rotating by an initial start angle means all windows display appropriately
			// after the window for the top disk (start angle 0) is adjusted correctly.
			ctx.rotate(this.startAngle * Math.PI/180);

			// clear out space in the inner wheel as "cutaway"
			var cutoutWindowRadius = 28; //28 fits within inner wheel
			ctx.globalCompositeOperation = 'destination-out';
			ctx.beginPath();
			ctx.arc(0, 0, cutoutWindowRadius, 0, 2*Math.PI);
			ctx.fill();

			// only draw in areas the canvas doesn't have data already (i.e., cutaway)
			ctx.globalCompositeOperation = 'destination-over';

			// encircle opening (why yellow?)
			ctx.strokeStyle = "yellow";
			ctx.beginPath();
			ctx.arc(0, 0, cutoutWindowRadius, 0, 2*Math.PI);
			ctx.stroke();

			// prevarikation cutouts are center@bottom right,
			// blank_reg is closer to upper-right side
			//
			// NOTE: left and right disks will appear to have misleading disk placement
			// w/r/t cutout window, but it's because cutouts are viewed from the back
			var colorCodedDiskCenterPos = {
				x: (this.cutawayType === AxisDisk.CUTAWAY_BLANK_REG ? 5/4*cutoutWindowRadius : cutoutWindowRadius),
				y: (this.cutawayType === AxisDisk.CUTAWAY_BLANK_REG ? 0 : cutoutWindowRadius)
			}
			var colorCodedDiskRadius = 2*28; // no definite reason for this scale

			if (this.cutawayType === AxisDisk.CUTAWAY_BLANK_REG) {
				// blank_reg's windows are partially occluded due to plastic
				ctx.fillStyle = '#8ba7b4'; // gray, from video
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.arc(0, 0, colorCodedDiskRadius, 9/8*Math.PI, -1/8*Math.PI);
				ctx.fill();

				// center post is visible
				ctx.fillStyle = 'white';
				ctx.beginPath();
				ctx.moveTo(colorCodedDiskCenterPos.x, colorCodedDiskCenterPos.y);
				ctx.arc(colorCodedDiskCenterPos.x, colorCodedDiskCenterPos.y, 1/3 * colorCodedDiskRadius, 0, 2*Math.PI);
				ctx.fill();
			}

			var cutawayOffset = undefined;
			switch(this.cutawayType) {
				case AxisDisk.CUTAWAY_PREVARIKATION: cutawayOffset = 24 * -5; break;// gate is BWR in window
				case AxisDisk.CUTAWAY_BLANK_REG:     cutawayOffset = 24 * -3; break; // gate is WGB in window
				default: break;
			}

			var rotationAngle = (72 * this.index.N + 24 * this.index.M) % 360;
			var gateAngle = (72 * this.gate.index.N + 24 * this.gate.index.M) % 360;
			var compositeAngle = ((cutawayOffset + rotationAngle - gateAngle + this.singleStepAngle) % 360) * Math.PI/180;

			var sliceAngle = 2*Math.PI / 15;
			var colors = ['red', 'orange', 'yellow', 'green', '#88f'];
			for (var i = 0; i < 15; ++i) {
				switch(i % 3) {
					case 0: ctx.fillStyle = colors[i/3]; break;
					case 1: ctx.fillStyle = 'black'; break;
					case 2: ctx.fillStyle = 'white'; break;
				}

				// indicate gates, sorta
				if ( (this.cutawayType === AxisDisk.CUTAWAY_BLANK_REG && (i === 10 || i === 11)) ||
				     (this.cutawayType === AxisDisk.CUTAWAY_PREVARIKATION && (i === 13 || i === 14))) {
					var gradient = ctx.createRadialGradient(0, 0, 0, cutoutWindowRadius, cutoutWindowRadius, colorCodedDiskRadius);
					gradient.addColorStop(0, ctx.fillStyle);
					gradient.addColorStop(
						((this.cutawayType === AxisDisk.CUTAWAY_BLANK_REG && i === 10) || (this.cutawayType === AxisDisk.CUTAWAY_PREVARIKATION && i === 13) ? 1 : 0.4),
						'#0000');
					ctx.fillStyle = gradient;
				}

				ctx.beginPath();
				ctx.moveTo(colorCodedDiskCenterPos.x, colorCodedDiskCenterPos.y);
				ctx.arc(colorCodedDiskCenterPos.x, colorCodedDiskCenterPos.y, colorCodedDiskRadius, compositeAngle + i*sliceAngle, compositeAngle + (i+1)*sliceAngle);
				ctx.fill();
			}

		}

        ctx.restore();
    }

	rotateToAbsoluteAngle(newAngle) {
		this.offsetAngle = newAngle % 360;
		this.singleStepAngle = 0;
	}

    rotateToIncrementalAngle(incrementalAngle) {
		this.singleStepAngle = incrementalAngle;
    }

	index2Angle() {
		this.offsetAngle = (72 * this.index.N + 24 * this.index.M) % 360;
		this.singleStepAngle = 0;
	}

	turnCCW() {
		this.index.M++;
		if (this.index.M > 1) {
			this.index.M = -1;
			this.index.N++;
		}
		this.index.N %= 5;
		this.index2Angle();
	}

	turnCW() {
		this.index.M--;
		if (this.index.M < -1) {
			this.index.M = 1;
			this.index.N--;
		}
		this.index.N = (this.index.N + 5) % 5;
		this.index2Angle();
	}

    // for control curves, see static section
	controlCurveAngle(movement, step)
	{
		var controlCurveNumber;
		var normalizedMovement;
		var angle;

		var isPartialMove = AxisDisk.isPartialMove(movement);
		movement = AxisDisk.normalizedMoveDirection(movement);

		switch (this.internalDiskNumber) {
			case AxisDisk.DISK_TOP:
				switch (movement) {
					case AxisDisk.MOVE_LEFT:  normalizedMovement = AxisDisk.MOVE_LEFT; break;
					case AxisDisk.MOVE_UP:    normalizedMovement = AxisDisk.MOVE_UP; break;
					case AxisDisk.MOVE_RIGHT: normalizedMovement = AxisDisk.MOVE_RIGHT; break;
					case AxisDisk.MOVE_DOWN:  normalizedMovement = AxisDisk.MOVE_UNAFFECTED; break;
				}
				break;
			case AxisDisk.DISK_LEFT:
				switch (movement) {
					case AxisDisk.MOVE_LEFT:  normalizedMovement = AxisDisk.MOVE_UP; break;
					case AxisDisk.MOVE_UP:    normalizedMovement = AxisDisk.MOVE_RIGHT; break;
					case AxisDisk.MOVE_RIGHT: normalizedMovement = AxisDisk.MOVE_UNAFFECTED; break;
					case AxisDisk.MOVE_DOWN:  normalizedMovement = AxisDisk.MOVE_LEFT; break;
				}
				break;
			case AxisDisk.DISK_RIGHT:
				switch (movement) {
					case AxisDisk.MOVE_LEFT:  normalizedMovement = AxisDisk.MOVE_UNAFFECTED; break;
					case AxisDisk.MOVE_UP:    normalizedMovement = AxisDisk.MOVE_LEFT; break;
					case AxisDisk.MOVE_RIGHT: normalizedMovement = AxisDisk.MOVE_UP; break;
					case AxisDisk.MOVE_DOWN:  normalizedMovement = AxisDisk.MOVE_RIGHT; break;
				}
				break;
			case AxisDisk.DISK_BOTTOM:
				switch (movement) {
					case AxisDisk.MOVE_LEFT:  normalizedMovement = AxisDisk.MOVE_RIGHT; break;
					case AxisDisk.MOVE_UP:    normalizedMovement = AxisDisk.MOVE_UNAFFECTED; break;
					case AxisDisk.MOVE_RIGHT: normalizedMovement = AxisDisk.MOVE_LEFT; break;
					case AxisDisk.MOVE_DOWN:  normalizedMovement = AxisDisk.MOVE_UP; break;
				}
				break;
		}

		switch (this.index.M) {
			case 0:
				switch (normalizedMovement) {
					case AxisDisk.MOVE_UP:
						controlCurveNumber = 0;
						break;
					case AxisDisk.MOVE_LEFT:
						controlCurveNumber = 3;
						break;
					case AxisDisk.MOVE_RIGHT:
						controlCurveNumber = 6;
						break;
				}
				break;
			case 1:
				switch (normalizedMovement) {
					case AxisDisk.MOVE_UP:
						controlCurveNumber = 1;
						break;
					case AxisDisk.MOVE_LEFT:
						controlCurveNumber = 4;
						break;
					case AxisDisk.MOVE_RIGHT:
						controlCurveNumber = 7;
						break;
				}
				break;
			case -1:
				switch (normalizedMovement) {
					case AxisDisk.MOVE_UP:
						controlCurveNumber = 2;
						break;
					case AxisDisk.MOVE_LEFT:
						controlCurveNumber = 5;
						break;
					case AxisDisk.MOVE_RIGHT:
						controlCurveNumber = 8;
						break;
				}
				break;
		}

		if (isPartialMove) {
			controlCurveNumber += 9;
		}

		if (normalizedMovement == AxisDisk.MOVE_UNAFFECTED) {
			angle = 0;
		} else {
            if (step === 100) {
                step = 99; // TODO: fix this hack at the source.
            }
			angle = - (AxisDisk.controlCurves[controlCurveNumber][Math.round(step)] - AxisDisk.controlCurves[controlCurveNumber][0]);
		}
		return angle;
	}

	move(movement) {
		var increment = Math.round(this.controlCurveAngle(movement, 99) / 24);

		this.index.M += increment;
		if (this.index.M > 1) {
			this.index.M -= 3;
			this.index.N += 1;
		} else if (this.index.M < -1) {
			this.index.M += 3;
			this.index.N -= 1;
		}
		// wraparound for negative values of N
		this.index.N = (this.index.N + 5) % 5;

		this.index2Angle();
	}

    moveToAbsolutePosition(pos) {
		this.setAbsolutePosition(pos)
        this.index2Angle();
    }

    getAbsolutePosition() {
        return (3*this.index.N + this.index.M + 15) % 15;
    }

	setAbsolutePosition(pos) {
        this.index.N = Math.floor((pos + 1) / 3) % 5;
        this.index.M = (pos % 3 === 2 ? -1 : (pos % 3));
	}

	setGateToCurrentPosition() {
		this.gate.index.N = this.index.N;
		this.gate.index.M = this.index.M;
	}

	toggleGateVisibility() {
        this.gate.visible = !this.gate.visible;
	}

    setMarkerToCurrentPosition(color) {
        this.markers.push({
            index: new AxisIndex(this.index.N, this.index.M),
            color: color
        });
	}

	clearAllMarkers() {
        this.markers = [];
	}

	deleteMarker() {
		for (var i = this.markers.length-1; i >= 0; --i) {
			if (this.markers[i].index.N === this.index.N && this.markers[i].index.M === this.index.M) {
				this.markers.splice(i, 1);
				break;
			}
		}
	}

	toggleCutawayColoringVisibility() {
		this.cutawayColoringVisible = !this.cutawayColoringVisible;
	}

	toggleCutawayType() {
		this.cutawayType = (this.cutawayType === AxisDisk.CUTAWAY_BLANK_REG ? AxisDisk.CUTAWAY_PREVARIKATION : AxisDisk.CUTAWAY_BLANK_REG);
	}

	setGateWithCurrentCutawayPositionOnReset() {
		// since the cutaway rotates in the opposite direction, we're just
		// setting the gate as if we rotated the *opposite* way.
		var currentPos = this.getAbsolutePosition();
		// hacky, we move to the new position because we can't set gate directly
		this.setAbsolutePosition( (-currentPos + 15) % 15 );
		this.setGateToCurrentPosition();
		this.setAbsolutePosition(currentPos);

	}
}
//statics
AxisDisk.PARTIAL_MOVE_RATIO = 1/2;
AxisDisk.PARTIAL_MOVES_OFFSET = 5;
AxisDisk.MOVE_UNAFFECTED = 0;
AxisDisk.MOVE_UP = 1;
AxisDisk.MOVE_LEFT = 2;
AxisDisk.MOVE_DOWN = 3;
AxisDisk.MOVE_RIGHT = 4;
AxisDisk.PARTIAL_MOVE_UP = AxisDisk.MOVE_UP + AxisDisk.PARTIAL_MOVES_OFFSET;
AxisDisk.PARTIAL_MOVE_LEFT = AxisDisk.MOVE_LEFT + AxisDisk.PARTIAL_MOVES_OFFSET;
AxisDisk.PARTIAL_MOVE_DOWN = AxisDisk.MOVE_DOWN + AxisDisk.PARTIAL_MOVES_OFFSET;
AxisDisk.PARTIAL_MOVE_RIGHT = AxisDisk.MOVE_RIGHT + AxisDisk.PARTIAL_MOVES_OFFSET;

AxisDisk.isPartialMove = function(move) {
	return move >= AxisDisk.PARTIAL_MOVE_UP && move <= AxisDisk.PARTIAL_MOVE_RIGHT;
}
AxisDisk.normalizedMoveDirection = function(move){ return move % AxisDisk.PARTIAL_MOVES_OFFSET; }
AxisDisk.makePartialMove = function(move) { return move + (move !== AxisDisk.MOVE_UNAFFECTED ? AxisDisk.PARTIAL_MOVES_OFFSET : 0); }

AxisDisk.DISK_TOP = 0;
AxisDisk.DISK_LEFT = 1;
AxisDisk.DISK_BOTTOM = 2;
AxisDisk.DISK_RIGHT = 3;

AxisDisk.CUTAWAY_BLANK_REG = 0;
AxisDisk.CUTAWAY_PREVARIKATION = 1;

AxisDisk.ACTIVE_DISK_AREA_WIDTH = 640;
AxisDisk.SCALE = 0.78;
AxisDisk.centerX = undefined;
AxisDisk.centerY = undefined;
// empirical -- the distance from working center to tip of any gate tester. scaled down.
// calculated as appx. (gate tester image size - 2*tester triangle width)/2 == 371,
// adjusted by * 0.78.
AxisDisk.distanceX = 295;
AxisDisk.distanceY = 295;
AxisDisk.fontSizePx = 19; // empirical
AxisDisk.radius = undefined;

AxisDisk.controlCurves =
    [ // 100 steps (50 moving into the disk and 50 moving out of the disk)
      // comments refer to upper disk: M, Direction

    // #0: 0, Up
    [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
	   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  -1,  -3,
	  -6,  -9, -12, -16, -20, -24, -29, -33, -38, -42, -49, -49, -48, -47, -47, -47, -47, -47, -47, -47,
	 -47, -47, -47, -47, -47, -47, -47, -48, -50, -52, -54, -56, -58, -60, -62, -65, -67, -68, -69, -70,
	 -71, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72],

    // #1: +1, Up
	[-24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24,
	 -24, -24, -24, -24, -24, -24, -23, -21, -20, -19, -18, -17, -16, -16, -16, -16, -16, -16, -16, -16,
	 -16, -16, -16, -17, -21, -26, -31, -36, -40, -44, -49, -49, -49, -48, -48, -48, -48, -47, -47, -47,
	 -47, -47, -47, -47, -47, -47, -47, -47, -50, -52, -54, -56, -58, -60, -62, -64, -66, -67, -69, -70,
	 -71, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72],

    // #2: -1, Up
	[ 24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  26,  27,  29,  30,  32,  34,  36,  38,
	  40,  42,  44,  45,  46,  48,  49,  50,  52,  53,  54,  54,  55,  56,  56,  56,  56,  56,  56,  56,
	  56,  56,  56,  56,  53,  50,  45,  41,  37,  32,  26,  23,  24,  24,  25,  25,  25,  25,  25,  25,
	  25,  25,  25,  25,  25,  25,  25,  23,  21,  19,  17,  15,  13,  11,   9,   7,   5,   3,   2,   0,
	   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],

    // #3: 0, Left:
	[  0,   0,   0,   0,   0,   0,   0,   0,   0,   1,   3,   4,   6,   8,   9,  11,  13,  14,  16,  17,
	  19,  20,  21,  22,  24,  25,  26,  26,  27,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,
	  28,  22,  17,  11,   6,   1,  -4,  -8, -14, -15, -15, -15, -14, -13, -12, -11, -10,  -9,  -8,  -8,
	  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7, -10, -12, -14, -16, -18, -19, -20, -22,
	 -23, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24],

    // #4: +1, Left
    [ -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24,
	  -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -28, -31, -35, -38, -40, -43,
	  -47, -51, -55, -60, -64, -69, -74, -78, -82, -88, -88, -87, -86, -85, -84, -83, -81, -80, -80, -79,
	  -79, -79, -79, -79, -79, -79, -79, -79, -79, -79, -79, -81, -83, -85, -86, -88, -90, -91, -92, -94,
	  -95, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96], 

    // #5: -1, Left
    [  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,
	   24,  24,  24,  24,  24,  24,  24,  24,  24,  25,  25,  25,  25,  25,  25,  25,  25,  25,  25,  25,
	   25,  25,  20,  15,  10,   4,  -1,  -5, -10, -12, -16, -15, -14, -13, -12, -11, -10,  -8,  -7,  -7,
	   -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -7,  -9, -11, -13, -14, -16, -18, -19, -20, -22,
	  -23, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24], 

    // #6: 0, Right:
	[   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
		0,   0,   1,   3,   4,   5,   7,   8,   9,  10,  11,  12,  12,  13,  13,  13,  13,  13,  13,  13,
	   13,  13,  12,   8,   4,   1,  -3,  -5,  -8, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10,
	  -10, -10, -10, -10, -10, -11, -14, -16, -18, -20, -22, -24, -27, -30, -32, -34, -36, -38, -40, -42,
	  -43, -44, -45, -46, -46, -47, -47, -47, -47, -47, -47, -47, -47, -47, -47, -48, -48, -48, -48, -48],

    // #7: +1, Right
	[ -24, -24, -24, -24, -24, -24, -24, -24, -24, -23, -21, -19, -18, -16, -14, -12, -10,  -9,  -7,  -5,
	   -4,  -2,   0,   2,   3,   4,   6,   7,   8,   9,  10,  11,  11,  12,  13,  13,  13,  13,  13,  13,
	   13,  13,  13,  10,   6,   3,   1,  -3,  -5,  -8, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10,
	  -10, -10, -10, -10, -10, -11, -14, -16, -18, -20, -22, -24, -27, -30, -31, -33, -35, -38, -40, -42,
	  -43, -44, -45, -46, -46, -47, -47, -47, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48],

    // #8: -1, Right
    [  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  25,  25,  25,  25,  25,  25,  26,  26,
	   26,  26,  26,  26,  26,  26,  26,  26,  26,  26,  26,  26,  26,  26,  26,  26,  26,  26,  26,  25,
	   23,  19,  16,  12,   9,   6,   1,  -3,  -6, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10,
	  -10, -10, -10, -10, -10, -10, -11, -15, -16, -18, -20, -22, -24, -27, -30, -31, -33, -35, -38, -39,
	  -40, -41, -42, -43, -44, -46, -47, -47, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48],

	 // Partial moves: TODO: replace constant arrays with MOVE_UNAFFECTED in upstream code
     // #9: 0, Partial up
     new Array(100).fill(0),
 
	 // #10: +1, Partial up
	 new Array(100).fill(-24),
 
	 // #11: -1, Partial up
	 [ 24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,
	   24,  24,  24,  26,  26,  27,  27,  29,  29,  30,  30,  32,  32,  34,  34,  36,  36,  38,  38,  40,
	   40,  42,  42,  44,  44,  45,  45,  46,  46,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,
	   48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,
	   48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48,  48],
 
	 // #12: 0, Partial left:
	 [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,   1,   3,   3,   5,
	    5,   6,   6,   8,   8,   9,   9,  10,  10,  13,  13,  14,  14,  15,  15,  16,  16,  18,  18,  19,
	   19,  20,  20,  21,  21,  22,  22,  23,  23,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,
	   24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,
	   24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24],
 
	 // #13: +1, Partial left
	 new Array(100).fill(-24),
 
	 // #14: -1, Partial left
	 new Array(100).fill(24), 
 
	 // #15: 0, Partial right:
	 [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
		0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
		0,   0,   0,   0,   2,   2,   3,   3,   4,   4,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,
		5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,
		5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5],
 
	 // #16: +1, Partial right
	 [ -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -23, -23,
	   -22, -22, -20, -19, -18, -17, -16, -15, -14, -13, -12, -11, -10,  -9,  -7,  -7,  -5,  -5,  -4,  -4,
	    -2,  -2,   0,   0,   1,   2,   3,   3,   4,   4,   6,   6,   6,   6,   6,   6,   6,   6,   6,   6,
	     6,   6,   6,   6,   6,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,
	     5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5,   5],
 
	 // #17: -1, Partial right
	 new Array(100).fill(24)

    ];