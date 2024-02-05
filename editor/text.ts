import {
  WritingDirection,
  resolveWritingDirection,
  searchAll,
} from '../base/string.ts';
import { Rect2D } from '../base/math.ts';
import { assert } from '../base/error.ts';

const OFFSCREEN_CANVAS = new OffscreenCanvas(100, 100);

export class MeasuredText {
  readonly characterWidths: readonly number[];
  readonly wordEdges: readonly number[];
  readonly lines: readonly (readonly [string, Rect2D])[];
  readonly characterRects: Rect2D[];
  readonly characterMetrics: TextMetrics[];

  constructor(
    readonly text: string,
    readonly style: CSSStyleDeclaration,
    readonly width: number,
    readonly dir: WritingDirection = 'auto',
  ) {
    const wordEdges = searchAll(text, /(?:^|\s)/gmu);
    this.wordEdges = wordEdges;
    const [charWidths, charMetrics] = measureCharacters(text, style);
    this.characterWidths = charWidths;
    this.characterMetrics = charMetrics;
    const lines: [string, Rect2D][] = [];
    const charRects: Rect2D[] = [];
    if (dir === 'auto') {
      dir = resolveWritingDirection(text);
    }
    const lineHeight = CSSNumericValue.parse(style.lineHeight).to('px').value;
    let lineWidth = 0;
    let prevLineBreak = 0;
    let y = 0;
    for (let i = 0; i < text.length; ++i) {
      const w = charWidths[i];
      if (lineWidth + w >= width) {
        const prevWordBoundary = findValueBefore(i, wordEdges) || i;
        const line = text.substring(prevLineBreak, prevWordBoundary);
        let actualWidth = 0;
        for (let j = prevLineBreak; j < prevWordBoundary; ++j) {
          const w2 = charWidths[j];
          charRects.push({
            x: actualWidth,
            y,
            width: w2,
            height: lineHeight, // TODO: Actual letter height
          });
          actualWidth += w2;
        }
        prevLineBreak = prevWordBoundary;
        lineWidth = 0;
        lines.push([
          line,
          {
            x: dir === 'rtl' ? width - actualWidth : 0,
            y,
            width: actualWidth,
            height: lineHeight,
          },
        ]);
        y += lineHeight;
      } else {
        lineWidth += w;
      }
    }
    if (prevLineBreak < text.length) {
      const line = text.substring(prevLineBreak, text.length);
      let actualWidth = 0;
      for (let j = prevLineBreak; j < text.length; ++j) {
        const w2 = charWidths[j];
        charRects.push({
          x: actualWidth,
          y,
          width: w2,
          height: lineHeight, // TODO: Actual letter height
        });
        actualWidth += w2;
      }
      lines.push([
        line,
        {
          x: dir === 'rtl' ? width - lineWidth : 0,
          y,
          width: lineWidth,
          height: lineHeight,
        },
      ]);
    }
    assert(charRects.length === text.length);
    this.lines = lines;
    this.characterRects = charRects;
  }
}

const HEBREW_REGEX =
  /[\u0590-\u05FF|\u200C-\u2010|\u20AA|\u25CC|\uFB1D-\uFB4F]/gm;

/**
 * Given text and CSS style, this function measures the width of each character
 * when rendered sequentially using the provided style.
 *
 * @param text The text to measure.
 * @param style The style to be applied when rendering the text.
 *
 * @returns An array of character widths.
 */
export function measureCharacters(
  text: string,
  style: CSSStyleDeclaration,
): [number[], TextMetrics[]] {
  if (!text.length) {
    return [[], []];
  }
  const ctx = OFFSCREEN_CANVAS.getContext('2d')!;
  ctx.save();
  ctx.font = style.font;
  ctx.fontKerning = style.fontKerning as CanvasFontKerning;
  // ctx.fontStretch = style.fontStretch;
  // ctx.fontVariantCaps = style.fontVariantCaps;
  const widths: number[] = [];
  const metrics: TextMetrics[] = [];
  let prevWidth = 0;
  for (let i = 0; i < text.length; ++i) {
    const m = ctx.measureText(text.substring(0, i + 1));
    const width = m.width;
    let charWidth = width - prevWidth;
    if (text[i].match(HEBREW_REGEX)) {
      charWidth = Math.floor(1.1 * charWidth);
    }
    widths.push(charWidth);
    metrics.push(m);
    prevWidth = width;
  }
  ctx.restore();
  return [widths, metrics];
}

function findValueBefore(desired: number, values: number[]): number {
  for (let i = 0; i < values.length; ++i) {
    if (values[i] > desired) {
      return i > 0 ? values[i - 1] : 0;
    }
  }
  return values[values.length - 1];
}
