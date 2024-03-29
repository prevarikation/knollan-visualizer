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

class AxisUI
{
    // constructor generates static images for the unchanging bits of each
    // UI page (instructions, basically) and updates dynamic portions of said
    // pages within draw().
    constructor(referenceCanvas) {
        this.referenceCtx = referenceCanvas.getContext('2d');
        this.ctx = {};
        for (const [name, page] of Object.entries(AxisUI.instructionPages)) {
            this.ctx[name] = referenceCanvas.cloneNode(false).getContext('2d');
            var ctx = this.ctx[name];
            ctx.save();

            // Attempt to recreate the original rendered instructions, but
            // allow us to tweak commands and formatting.
            // ALL MEASUREMENTS EMPIRICAL.
            function cssFontString(type, prefix) {
                return (typeof prefix !== 'undefined' ? prefix + ' ' : '') + (typeof AxisVisualizer.FONT_SIZES[type] !== 'undefined' ? AxisVisualizer.FONT_SIZES[type] : '16') + 'px Arial, sans-serif';
            }

            // instructions
            var instructionFontSize = AxisVisualizer.FONT_SIZES.instruction;
            var rightColX = 796, rightColY = 158;
            var instructionRightColX = 1200;

            ctx.font = cssFontString('instruction');
            ctx.fillText(page.header, rightColX, rightColY);
            ctx.fillStyle = 'black';
            // draw underline beneath instructions
            ctx.strokeStyle = 'black';
            ctx.beginPath();
            var lineY = rightColY + Math.floor(AxisVisualizer.FONT_SIZES.instruction/6);
            ctx.moveTo(rightColX, lineY);
            ctx.lineTo(rightColX + ctx.measureText(page.header).width, lineY);
            ctx.closePath();
            ctx.stroke();

            rightColY += Math.floor(1.2 * instructionFontSize);
            ctx.font = cssFontString('instructionExplanation');
            ctx.fillText(page.subheader, rightColX, rightColY);

            ctx.font = cssFontString('instruction');
            rightColY += (2.0 * instructionFontSize);
            var rightColYBeforeCommands = rightColY;
            for (var i = 0; i < page.commands.length; ++i) {
                // for interpreting touch events
                page.commands[i].bounds = [[rightColX, rightColY - instructionFontSize], [instructionRightColX, undefined]];

                ctx.fillText(page.commands[i][0] + (page.commands[i][1] ? ":" : ""), rightColX, rightColY);

                var origFont = ctx.font;
                ctx.font = cssFontString('instruction', 'bold');
                for (var j = 1; j < page.commands[i].length; ++j) {
                    ctx.fillText(page.commands[i][j], instructionRightColX - ctx.measureText(page.commands[i][j]).width, rightColY);
                    rightColY += Math.floor(1.45 * instructionFontSize);
                }

                // now we know how far the bounding box extends vertically
                page.commands[i].bounds[1][1] = rightColY - instructionFontSize;

                ctx.font = cssFontString('instruction');
            }

            // TODO: refactor, pull this out of here
            if (name === "standard") {
                // speed level indicators
                ctx.font = cssFontString('instructionExplanation');
                ctx.fillStyle = '#2429bc';
                var speedPositionInCommandList = 3;
                rightColY = rightColYBeforeCommands + ((speedPositionInCommandList - 1) * 1.45 * instructionFontSize);
                var speedText = "normal  slow  instant";
                var speedTextX = instructionRightColX - (ctx.measureText(page.commands[speedPositionInCommandList-1][1]).width * instructionFontSize/AxisVisualizer.FONT_SIZES.instructionExplanation) -ctx.measureText(speedText + " ").width;
                var speedTextY = rightColY - (ctx.measureText(speedText).actualBoundingBoxAscent * (instructionFontSize/AxisVisualizer.FONT_SIZES.instructionExplanation - 1.05));
                ctx.fillText(speedText, speedTextX, speedTextY);
            }

            ctx.restore();
        }
    }

    draw(page, options) {
        if (!AxisUI.instructionPages[page]) {
            page = "standard";
        }

        var ctx = this.referenceCtx;
        ctx.save();

        if (options.rawMoves) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            var lineHeight = 32;
            ctx.font = lineHeight + 'px monospace';
            // complications below are because we are emulating linebreaks.
            var maxRawMoveWidth = 690; //empirical
            for (var totalLines = 1; options.rawMoves.length; ++totalLines) {
                var totalWidth = ctx.measureText(options.rawMoves).width;
                var charactersInCurrentLine = Math.floor(options.rawMoves.length * (maxRawMoveWidth/totalWidth));

                ctx.fillText(options.rawMoves.substring(0, charactersInCurrentLine), AxisVisualizer.centerX - 50, (totalLines - 3/4) * lineHeight);

                options.rawMoves = options.rawMoves.substring(charactersInCurrentLine).replace(/^[ ]*/, '');
            }
        }

        if (options.currentCombination) {
            var extendedNicerFormat  = AxisStates.GetNicerCombinationFormat2(options.currentCombination);
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            var textHeight = 20;
            ctx.font = textHeight + 'px sans-serif';
            ctx.fillStyle = '#2429bc';
            var knobHeight = AxisKnobInterfacePlate.REFERENCE_HEIGHT/2;
            ctx.fillText("Combination:", AxisVisualizer.centerX + 2*knobHeight/3, AxisVisualizer.centerY - knobHeight);
            ctx.fillText(extendedNicerFormat, AxisVisualizer.centerX + 2*knobHeight/3, AxisVisualizer.centerY - knobHeight + textHeight);
            ctx.restore();
        }

        if (page === "standard") {
            // speed indicator box
            var boundingRect = null;
            switch(options.automaticAnimationTime) {
                case AxisVisualizer.ANIMATION_TIMES.slow:       boundingRect = { offsetX: 73, width: 47}; break;
                case AxisVisualizer.ANIMATION_TIMES.instant:    boundingRect = { offsetX: 124, width: 66}; break;
                default:                                        boundingRect = { offsetX: 0, width: 70}; break;
            }

            // values based off AxisBackground.js
            var speedTextBackground = { fontSize: AxisVisualizer.FONT_SIZES.instructionExplanation, originX: 975, originY: 313 };
            ctx.strokeStyle = '#2429bc';
            ctx.strokeRect(
                speedTextBackground.originX + boundingRect.offsetX - speedTextBackground.fontSize/4,
                speedTextBackground.originY - speedTextBackground.fontSize,
                boundingRect.width,
                speedTextBackground.fontSize * 5/4);
        }

        ctx.restore();

        if (options.shortenedMoves) {
            var combination = options.shortenedMoves;
            var extendedNicerFormat  = AxisStates.GetNicerCombinationFormat2(combination);
            var condensedNicerFormat = AxisStates.GetNicerCombinationFormat(combination);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            // extended
            ctx.font = '32px sans-serif';
            ctx.fillText(extendedNicerFormat, AxisVisualizer.centerX, AxisVisualizer.centerY + AxisKnobInterfacePlate.REFERENCE_HEIGHT/2 + 45);
            // condensed
            ctx.font = '20px sans-serif';
            ctx.fillText(condensedNicerFormat, AxisVisualizer.centerX, AxisVisualizer.centerY + AxisKnobInterfacePlate.REFERENCE_HEIGHT/2 + 45 + 32);
            ctx.restore();
        }

        if (options.antecedentMoves) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.font = '18px sans-serif';
            ctx.fillStyle = '#2429bc';
            ctx.fillText(options.antecedentMoves, AxisVisualizer.centerX, AxisVisualizer.centerY + AxisKnobInterfacePlate.REFERENCE_HEIGHT/2 + 45 + 32 + 20);
            ctx.restore();
        }        

        ctx.drawImage(this.ctx[page].canvas, 0, 0);
    }
}
// statics

AxisUI.instructionPages = {
    standard: {
        header: "Instructions:",
        subheader: "Click here to activate, then use these keys:",
        commands: [
            ["Move the knob", "<Cursor keys>"],
            ["Step", "<Shift>+<Cursor keys>"],
            ["Toggle speed", "<f>"],
            ["Undo move", "<b>"],
            ["Reset the disks", "<r>"],
            ["Set / show the gates", "<s> / <g>"],
            ["Select disk", "<8>, <4>, <6>, <2>", "or <u>, <h>, <j>, <n>"],
            ["Turn disk", "<+> / <->"],
            ["Change marker color", "<c>"],
            ["Set marker", "<m>"],
            ["Delete marker(s)", "<d>, <del>"],
            ["Research menu", "</>"]
        ],
    },
    research: {
        header: "Research:",
        subheader: "All key commands still active",
        commands: [
            /*
            // TODO: implement this!
            ["Mobile usage (moves, tap to cycle instructions for partial moves)", ""]
            */
            ["½ Move", "<Alt>+<Cursor>"],
            ["½ Step", "<Shift>+<Alt>+<Cursor>"],
            ["", ""],
            ["Store / recall disk pos.", "<P> / <p>"],
            ["Lock / unlock gate positions", "<L>"],
            // shift+s because set ALL gates is on different page, and the s/S
            // distinction may be confusing for a command that has no undo
            ["Set gate of sel. disk", "<Shift>+<s>"],
            ["", ""],
            ["Show current combination", "<q>"],
            ["Show raw moves", "<!>"],
            ["Show shortened moves", "<~>"],
            ["Show antecedent moves", "<@>"],
            ["", ""],
            ["Research menu 2", "</>"]
        ]
    },
    research2: {
        header: "Research 2:",
        subheader: "All key commands still active",
        commands: [
            ["Blank_Reg cutaway windows", "<#>"],
            ["Toggle cutaway type (B_R / p)", "<$>"],
            ["Set gate(s) as if cutaway coloring", ""],
            ["was at reset position", "<E> / <e>"],
            ["", ""],
            ["Log combination states visited", ""],
            ["during current move", "<(>"],
            ["", ""],
            ["Move randomly until combo is", ""],
            ["equivalent to 4-move combo", "<*>"],
            ["", ""],
            ["", ""],
            ["Standard menu", "</>"]
        ]
    }
};