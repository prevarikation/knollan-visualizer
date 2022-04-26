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

class AxisBackground
{
    constructor(referenceCanvas, image) {
        this.referenceCtx = referenceCanvas.getContext('2d');
        this.ctx = referenceCanvas.cloneNode(false).getContext('2d');
        this.ctx.save();

        if (image) {
            this.ctx.drawImage(image, 0, 0);
        } else {
            // Attempt to recreate the original rendered background, but
            // allow us to tweak commands and formatting.
            // ALL MEASUREMENTS EMPIRICAL.
            function cssFontString(type, prefix) {
                return (typeof prefix !== 'undefined' ? prefix + ' ' : '') + (typeof AxisVisualizer.FONT_SIZES[type] !== 'undefined' ? AxisVisualizer.FONT_SIZES[type] : '16') + 'px Arial, sans-serif';
            }

            // decently close new background gradient?
            var bgGradient = this.ctx.createLinearGradient(0, this.ctx.canvas.width, this.ctx.canvas.width, 0);
            bgGradient.addColorStop(0, '#2a2a2a');
            bgGradient.addColorStop(.5, '#b9b9b9');
            bgGradient.addColorStop(1, 'white');
            this.ctx.fillStyle = bgGradient;
            this.ctx.fillRect(0, this.ctx.canvas.height - this.ctx.canvas.width, this.ctx.canvas.width, this.ctx.canvas.width);

            // draw final move state reminder
            var stateReminderCircleCenters = [ [1172, 83], [1098, 83], [1135, 46], [1135, 120] ];
            var stateReminderCircleText = [ "+1", "-1", "0", "x" ];
            var stateReminderCircleRadius = 18.5;
            this.ctx.strokeStyle = '#808080';
            this.ctx.fillStyle = '#808080';
            this.ctx.font = cssFontString('moveStateReminder', 'bold');
            for (var i = 0; i < stateReminderCircleCenters.length; ++i) {
                this.ctx.beginPath();
                this.ctx.arc(stateReminderCircleCenters[i][0], stateReminderCircleCenters[i][1], stateReminderCircleRadius, 0, 2*Math.PI);
                this.ctx.stroke();

                var reminderTextDimensions = this.ctx.measureText(stateReminderCircleText[i]);
                this.ctx.fillText(stateReminderCircleText[i], stateReminderCircleCenters[i][0] - reminderTextDimensions.width/2, stateReminderCircleCenters[i][1] + reminderTextDimensions.actualBoundingBoxAscent/2);
            }

            // titles
            var titleX = 24;
            this.ctx.font = cssFontString('title', 'bold');
            this.ctx.fillStyle = 'black';
            this.ctx.fillText("mh's Visualizer.", titleX, 59);
            this.ctx.fillStyle = '#5f5f5f';
            this.ctx.fillText("2021 Edition.", titleX, 105);
            this.ctx.fillStyle = 'black';
            this.ctx.font = cssFontString('adaptationNotice');
            this.ctx.fillText("An HTML5 <canvas> adaptation", titleX + 2, 130);

            // disclaimer
            this.ctx.font = cssFontString('disclaimer');
            var disclaimer = [
                "The author(s) are not affiliated with the lock manufacturer(s) in any way; the lock manufacturers or the authors' employers have nothing to do with this program. All",
                "trademarks are the property of their owners. Some of the concepts and techniques shown here are protected by intellectual property rights such as patents. The",
                "functionality may be incomplete and/or contain errors. The authors give NO WARRANTY AT ALL and accept NO LIABILITY WHATSOEVER concerning this program."
            ];
            for (var i = 0; i < disclaimer.length; ++i) {
                this.ctx.fillText(disclaimer[i], titleX, this.ctx.canvas.height - (disclaimer.length - i) * 12 - 5);
            }

            // open-source lock
            var OSLPromotion = [
                "Interested in high-security locks?",
                "Want to design one yourself?",
                "Check out",
                "www.TheOpenSourceLock.org"
            ];
            this.ctx.font = cssFontString('OSLPromotion');
            this.ctx.fillStyle = '#2429bc';
            var rightColX = 796, rightColY = 740;
            for (var i = 0; i < OSLPromotion.length; ++i) {
                this.ctx.fillText(OSLPromotion[i], rightColX, rightColY + i * Math.floor(1.2 * AxisVisualizer.FONT_SIZES.instruction));
            }

            // copyright
            this.ctx.font = cssFontString('copyright');
            this.ctx.fillStyle = 'black';
            this.ctx.fillText("\u00a9 2008-2009 Michael U. Huebler. All rights reserved.", rightColX, this.ctx.canvas.height - 35);
            this.ctx.fillText("\u00a9 2021 fork by prevarikation (MIT attribution license)", rightColX, this.ctx.canvas.height - 10);

            this.ctx.restore();
        }
    }

    draw() {
        this.referenceCtx.drawImage(this.ctx.canvas, 0, 0);
    }
}
