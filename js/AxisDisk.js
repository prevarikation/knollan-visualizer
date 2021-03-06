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
		AxisDisk.scale = AxisVisualizer.diskScale * AxisVisualizer.scale;
		AxisDisk.radius = image.width/2 * AxisDisk.scale;
		AxisDisk.centerX = centerX-1; //empirical tweaks for better visual coherency
		AxisDisk.centerY = centerY-1;
        if (!AxisDisk.distanceInitialized) {
            AxisDisk.distanceX *= AxisVisualizer.scale;
            AxisDisk.distanceY *= AxisVisualizer.scale;
            AxisDisk.fontSizePx *= AxisVisualizer.scale;
            AxisDisk.distanceInitialized = true;
        }

        this.index = new AxisIndex();
        this.gate = {
            visible: true,
            index: new AxisIndex(0, 0)
        };
		this.markers = [];
        this.colorSelector = new AxisColorSelector(canvas);
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
        ctx.drawImage(this.image, -AxisDisk.radius, -AxisDisk.radius, AxisDisk.scale * this.image.width, AxisDisk.scale * this.image.height);

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
		}
		this.index.N %= 5;

		this.index2Angle(this.index);
	}

	setGateToCurrentPosition() {
		this.gate.index.N = this.index.N;
		this.gate.index.M = this.index.M;
        this.gate.visible = true;
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

	deleteLastMarker() {
		if (this.markers.length > 0) {
            this.markers.pop();
		}
	}
}
//statics
AxisDisk.MOVE_UP = 1;
AxisDisk.MOVE_LEFT = 2;
AxisDisk.MOVE_DOWN = 3;
AxisDisk.MOVE_RIGHT = 4;
AxisDisk.MOVE_UNAFFECTED = 0;

AxisDisk.DISK_TOP = 0;
AxisDisk.DISK_LEFT = 1;
AxisDisk.DISK_BOTTOM = 2;
AxisDisk.DISK_RIGHT = 3;

AxisDisk.centerX = undefined;
AxisDisk.centerY = undefined;
// empirical -- the distance from working center to tip of any gate tester. scaled later on.
// calculated as appx. (gate tester image size - 2*tester triangle width)/2 == 371
AxisDisk.distanceX = 378;
AxisDisk.distanceY = 378;
AxisDisk.distanceInitialized = false;
AxisDisk.fontSizePx = 24; // empirical, also scaled later
AxisDisk.scale = undefined;
AxisDisk.radius = undefined;

AxisDisk.controlCurves =
    [ // 100 steps (50 moving into the disk and 50 moving out of the disk)
      // comments refer to upper disk: M, Direction

    // #0: 0, Up
    [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
       0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  -5,  -7,  
      -9, -11, -14, -17, -20, -24, -28, -33, -36, -40, -49, -49, -49, -49, -48, -48, -48, -48, -48, -48,
     -48, -48, -48, -48, -48, -48, -48, -48, -50, -52, -54, -56, -58, -60, -61, -63, -64, -65, -67, -68,
     -69, -70, -71, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72], 

    // #1: -1, Up
    [-24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, 
     -24, -24, -24, -23, -22, -21, -20, -19, -19, -18, -17, -17, -17, -17, -17, -17, -17, -17, -17, -17, 
     -17, -17, -17, -20, -24, -28, -33, -36, -40, -49, -49, -49, -49, -49, -48, -48, -48, -48, -48, -48, 
     -48, -48, -48, -48, -48, -48, -48, -48, -50, -52, -54, -56, -58, -60, -61, -63, -64, -65, -67, -68, 
     -69, -70, -71, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72, -72],

    // #2: +1, Up
    [ 24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  26,  27,  29,  30,  31,  33,  35,  36,  38,  40,  
      41,  42,  43,  45,  46,  47,  48,  49,  50,  50,  51,  52,  52,  52,  52,  52,  52,  52,  52,  52,
      52,  52,  52,  52,  48,  44,  39,  36,  32,  23,  23,  23,  23,  23,  24,  24,  24,  24,  24,  24, 
      24,  24,  24,  24,  24,  24,  24,  24,  22,  20,  18,  16,  14,  12,  11,   9,   8,   7,   5,   4,
       3,   2,   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0], 

    // #3: 0, Left:
    [  0,   0,   0,   0,   0,   0,   0,   0,   1,   3,   5,   6,   8,   9,  10,  13,  14,  15,  16,  18,
      19,  20,  21,  22,  23,  24,  24,  24,  25,  25,  25,  25,  25,  25,  25,  25,  25,  25,  25,  25,
      25,  20,  16,  10,   5,  -1,  -6, -10, -15, -17, -16, -15, -14, -13, -12, -11, -10,  -9,  -9,  -9,
      -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9, -11, -13, -14, -16, -18, -19, -20, -22,
     -23, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24], 

    // #4: -1, Left
    [ -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24,
      -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -28, -31, -35, -38, -41, -43,
      -47, -52, -56, -62, -67, -73, -78, -82, -87, -89, -88, -87, -86, -85, -84, -83, -82, -81, -81, -81,
      -81, -81, -81, -81, -81, -81, -81, -81, -81, -81, -81, -81, -83, -85, -86, -88, -90, -91, -92, -94,
      -95, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96, -96], 

    // #5: +1, Left
    [  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,
       24,  24,  24,  24,  24,  25,  26,  27,  27,  27,  27,  27,  27,  27,  27,  27,  27,  27,  27,  27,
       27,  25,  16,  10,   5,  -1,  -6, -10, -15, -17, -16, -15, -14, -13, -12, -11, -10,  -9,  -9,  -9,
       -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9,  -9, -11, -13, -14, -16, -18, -19, -20, -22, 
      -23, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24], 

    // #6: 0, Right:
    [   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
        0,   2,   3,   4,   6,   7,   8,   9,  10,  11,  11,  12,  13,  13,  13,  13,  13,  13,  13,  13, 
       13,  13,  10,   6,   3,   1,  -3,  -5,  -8, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10,
      -10, -10, -10, -10, -10, -11, -15, -16, -18, -20, -22, -24, -27, -30, -31, -33, -35, -38, -39, -40,
      -41, -42, -43, -44, -46, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48], 

    // #7: -1, Right
    [ -24, -24, -24, -24, -24, -23, -21, -19, -18, -16, -14, -12, -10,  -9,  -7,  -5,  -4,  -2,   0,   2,
        3,   4,   6,   7,   8,   9,  10,  11,  11,  12,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13, 
       13,  13,  10,   6,   3,   1,  -3,  -5,  -8, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10,
      -10, -10, -10, -10, -10, -10, -11, -15, -16, -18, -20, -22, -24, -27, -30, -31, -33, -35, -38, -39, 
      -40, -41, -42, -43, -44, -46, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48], 

    // #8: +1, Right
    [  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24, 
       24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  24,  22,  20,  18, 
       16,  13,  10,   6,   3,   1,  -3,  -5,  -8, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10, 
      -10, -10, -10, -10, -10, -10, -11, -15, -16, -18, -20, -22, -24, -27, -30, -31, -33, -35, -38, -39, 
      -40, -41, -42, -43, -44, -46, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48, -48]

    ];
