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
    constructor(referenceCanvas, image, newCenterX, newCenterY) {
		AxisKnobInterfacePlate.MAX_ABSOLUTE_MOVEMENT *= AxisVisualizer.scale;

        this.referenceCtx = referenceCanvas.getContext('2d');
        this.ctx = referenceCanvas.cloneNode(false).getContext('2d');
        this.image = image;

		this.CenterX = newCenterX;
		this.CenterY = newCenterY;
        var newWidth = image.width * 0.78;// AxisVisualizer.scale;
        var newHeight = image.height * 0.78;// AxisVisualizer.scale;
		this._x = this.CenterX - newWidth/2;
		this._y = this.CenterY - newWidth/2;

        this.ctx.drawImage(this.image, this._x, this._y, newWidth, newHeight);
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
AxisKnobInterfacePlate.MAX_ABSOLUTE_MOVEMENT = 110; //empirical. would be nice to have a real value.
AxisKnobInterfacePlate.MAX_INDEX = 50;
