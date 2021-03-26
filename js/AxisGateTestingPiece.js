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

class AxisGateTestingPiece
{
    constructor(referenceCanvas, image, newCenterX, newCenterY) {
        this.referenceCtx = referenceCanvas.getContext('2d');
        this.ctx = referenceCanvas.cloneNode(false).getContext('2d');

		this._x = newCenterX - (AxisVisualizer.scale * image.width)/2;
		this._y = newCenterY - (AxisVisualizer.scale * image.height)/2;

        this.ctx.drawImage(image, this._x, this._y, AxisVisualizer.scale * image.width, AxisVisualizer.scale * image.height);
    }

    draw() {
        this.referenceCtx.drawImage(this.ctx.canvas, 0, 0);
    }
}
