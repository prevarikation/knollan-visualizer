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

class AxisColorSelector
{
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.width = AxisColorSelector.width;
		this.visible = true;
	}

	static changeColor() {
		AxisColorSelector.currentColorIndex = (AxisColorSelector.currentColorIndex + 1) % AxisColorSelector.COLOR_SELECTION.length;
	}

    setCoordinates(centerX, centerY) {
        this.x = centerX - this.width/2;
        this.y = centerY - this.width/2;
    }

	draw() {
        this.ctx.save();

        this.ctx.fillStyle = AxisColorSelector.COLOR_SELECTION[AxisColorSelector.currentColorIndex];
        this.ctx.strokeStyle = 'black';
        this.ctx.fillRect(this.x, this.y, this.width, this.width);
        this.ctx.strokeRect(this.x, this.y, this.width, this.width);

        this.ctx.restore();
	}
}
//statics
AxisColorSelector.width = 23.4;
AxisColorSelector.COLOR_SELECTION = ['#f008', '#0f08', '#00f8', '#ff08', '#0ff8', '#f0f8'];
AxisColorSelector.currentColorIndex = 0;
