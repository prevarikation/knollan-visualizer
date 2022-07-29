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

class AxisKnobInterfacePlate
{
    constructor(referenceCanvas, newCenterX, newCenterY) {
        this.referenceCtx = referenceCanvas.getContext('2d');
        this.ctx = referenceCanvas.cloneNode(false).getContext('2d');

		newCenterX -= 1; // TODO: shouldn't be necessary, empirical tweak
		this.ctx.translate(newCenterX, newCenterY);

		// draw interface plate outside boundary
		var boundaryStandardOffset = 224;
		var boundaryNonBeveledWidth = 290;

		this.ctx.strokeStyle = "#f00a";
		this.ctx.lineWidth = 2;

		this.ctx.moveTo(-boundaryNonBeveledWidth/2, -boundaryStandardOffset);
		for (var i = 0; i < 4; ++i) {
			this.ctx.lineTo(boundaryNonBeveledWidth/2, -boundaryStandardOffset);
			this.ctx.rotate(Math.PI/2);
			this.ctx.lineTo(-boundaryNonBeveledWidth/2, -boundaryStandardOffset);
		}
		this.ctx.closePath();
		this.ctx.stroke();

		// draw interface plate pegs
		var pegStandardOffsetY = 202;
		var pegStandardOffsetX = 122;
		var pegShorterOffsetY = 62;
		var pegRadius = 9;

		this.ctx.strokeStyle = "#0f0000";
		this.ctx.lineWidth = 3;
		this.ctx.fillStyle = "red";

		for (var i = 0; i < 4; ++i) {
			for (var j of [-1, 1]) {
				this.ctx.beginPath();
				this.ctx.arc(-pegStandardOffsetX, j * pegStandardOffsetY, pegRadius, 0, 2*Math.PI);
				this.ctx.stroke();
				this.ctx.fill();
			}

			this.ctx.beginPath();
			this.ctx.arc(0, -pegShorterOffsetY, pegRadius, 0, 2*Math.PI);
			this.ctx.stroke();
			this.ctx.fill();

			this.ctx.rotate(Math.PI/2);
		}

		this.reset();
    }

	moveToAbsoluteIndex(newX, newY) {
		this.moveToAbsolutePosition(
            newX * AxisKnobInterfacePlate.MAX_ABSOLUTE_MOVEMENT/AxisKnobInterfacePlate.MAX_INDEX,
            newY * AxisKnobInterfacePlate.MAX_ABSOLUTE_MOVEMENT/AxisKnobInterfacePlate.MAX_INDEX
        );
	}

	moveToAbsolutePosition(newX, newY) {
		this.x = newX;
		this.y = newY;
	}

	reset() {
		this.moveToAbsolutePosition(0, 0);
	}

	draw() {
        // instead of repainting the (static) original image, we just paint it translated on the reference canvas.
        this.referenceCtx.drawImage(this.ctx.canvas, this.x, this.y);
	}
}
//statics
AxisKnobInterfacePlate.REFERENCE_HEIGHT = 577; // TODO: remove this, only used elsewhere in the UI code.
AxisKnobInterfacePlate.MAX_ABSOLUTE_MOVEMENT = 85.8; //empirical. would be nice to have a real value.
AxisKnobInterfacePlate.MAX_INDEX = 50;
