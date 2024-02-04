import { searchAll } from '../base/string.ts';

const OFFSCREEN_CANVAS = new OffscreenCanvas(1000, 1000);

/**
 * Given text and CSS style, this function measures the width of each character
 * when rendered sequentially using the provided style.
 *
 * @param text The text to measure.
 * @param style The style to be applied when rendering the text.
 *
 * @returns An array of character widths.
 */
export function measureCharacterWidths(
  text: string,
  style: CSSStyleDeclaration,
): number[] {
  if (!text.length) {
    return [];
  }
  const ctx = OFFSCREEN_CANVAS.getContext('2d')!;
  ctx.save();
  ctx.font = style.font;
  ctx.fontKerning = style.fontKerning as CanvasFontKerning;
  // ctx.fontStretch = style.fontStretch;
  // ctx.fontVariantCaps = style.fontVariantCaps;
  const result: number[] = [];
  let prevWidth = 0;
  for (let i = 0; i < text.length; ++i) {
    const metrics = ctx.measureText(text.substring(0, i + 1));
    const width = metrics.width;
    result.push(width - prevWidth);
    prevWidth = width;
  }
  ctx.restore();
  return result;
}

function findValueBefore(desired: number, values: number[]): number {
  for (let i = 0; i < values.length; ++i) {
    if (values[i] > desired) {
      return i > 0 ? values[i - 1] : 0;
    }
  }
  return values[values.length - 1];
}

/**
 * Given text, style and width, this function breaks the text into multiple
 * lines that fit in the desired width. It takes word boundaries into account
 * and should have the same ICU level as the browser.
 *
 * @param text The text to break.
 * @param style The CSS style to apply while measuring the text.
 * @param width The desired width to fit the text in.
 *
 * @returns An array of text lines and their matching widths.
 */
export function breakText(
  text: string,
  style: CSSStyleDeclaration,
  width: number,
): [string, number][] {
  const wordBreaks = searchAll(text, /\b/gm);
  const charWidths = measureCharacterWidths(text, style);
  const result: [string, number][] = [];
  let lineWidth = 0;
  let prevLineBreak = 0;
  for (let i = 0; i < text.length; ++i) {
    const w = charWidths[i];
    if (lineWidth + w >= width) {
      const prevWordBoundary = findValueBefore(i, wordBreaks);
      const line = text.substring(prevLineBreak, prevWordBoundary);
      let actualWidth = 0;
      for (let j = prevLineBreak; j < prevWordBoundary; ++j) {
        actualWidth += charWidths[j];
      }
      prevLineBreak = prevWordBoundary;
      lineWidth = 0;
      result.push([line, actualWidth]);
    } else {
      lineWidth += w;
    }
  }
  if (prevLineBreak < text.length) {
    const line = text.substring(prevLineBreak, text.length);
    result.push([line, lineWidth]);
  }
  return result;
}
