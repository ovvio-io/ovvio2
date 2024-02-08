import { numbersEqual } from '../base/comparisons.ts';
import { assert } from '../base/error.ts';
import { Rect2D } from '../base/math.ts';
import { WritingDirection, searchAll } from '../base/string.ts';
import { SpanNode } from '../cfds/richtext/model.ts';
import {
  GetEmbeddingLevelsResult,
  getEmbeddingLevels,
} from '../external/bidi-js/embeddingLevels.js';
import { getReorderedString } from '../external/bidi-js/index.js';
import { measureCharacters } from './text.ts';

export class ParagraphRenderer {
  private _canvas: HTMLCanvasElement | undefined;
  private _width: number;

  private _characterWidths: readonly number[] | undefined;
  private _wordEdges: readonly number[] | undefined;
  private _lines: readonly (readonly [string, Rect2D])[] | undefined;
  private _characterRects: Rect2D[] | undefined;
  private _characterMetrics: TextMetrics[] | undefined;
  private _bidiReversedText: string | undefined;
  private _bidiEmbeddingLevels: GetEmbeddingLevelsResult | undefined;

  constructor(
    readonly nodes: SpanNode[],
    readonly lineHeight: number,
    width: number,
  ) {
    this._width = Math.round(width);
  }

  get width(): number {
    return this._width;
  }

  set width(w: number) {
    w = Math.round(w);
    if (!numbersEqual(this._width, w)) {
      this._width = w;
      this._canvas = undefined;
    }
  }

  get canvas(): HTMLCanvasElement {
    if (!this._canvas) {
      const canvas = document.createElement('canvas');
      const scaleFactor = self.devicePixelRatio || 1;
      canvas.width = this.width * scaleFactor;
      canvas.height = 10;
      this.measureText();
      const h = (this._lines?.length || 0) * this.lineHeight;
      canvas.height = h * scaleFactor;
      canvas.style.width = `${this.width}px`;
      canvas.style.height = `${h}px`;
      this._canvas = canvas;
    }
    return this._canvas;
  }

  render(): void {
    const ctx = this.canvas.getContext('2d')!;
    for (const [lineText, bounds] of this._lines!) {
      ctx.fillText(lineText, bounds.x, bounds.y, bounds.width);
    }
  }

  /**
   * Given text and CSS style, this function measures the width of each character
   * when rendered sequentially using the provided style.
   *
   * @param text The text to measure.
   * @param style The style to be applied when rendering the text.
   *
   * @returns An array of character widths.
   */
  measureCharacters(text: string): [number[], TextMetrics[]] {
    if (!text.length) {
      return [[], []];
    }
    const ctx = this._canvas!.getContext('2d')!;
    const widths: number[] = [];
    const metrics: TextMetrics[] = [];
    let prevWidth = 0;
    for (let i = 0; i < text.length; ++i) {
      const m = ctx.measureText(text.substring(0, i + 1));
      const width = m.width;
      const charWidth = width - prevWidth;
      // if (text[i].match(HEBREW_REGEX)) {
      //   charWidth = Math.floor(1.1 * charWidth);
      // }
      widths.push(charWidth);
      metrics.push(m);
      prevWidth = width;
    }
    return [widths, metrics];
  }

  private measureText(): void {
    const width = this.width;
    const text = this.nodes[0].text;
    const bidiEmbeddingLevels = getEmbeddingLevels(text, 'auto');
    const dir = getBaseDirectionFromBidiLevels(bidiEmbeddingLevels.levels);
    this._bidiEmbeddingLevels = bidiEmbeddingLevels;
    const bidiReversedText =
      dir === 'rtl'
        ? text
        : getReorderedString(text, bidiEmbeddingLevels, 0, text.length);
    this._bidiReversedText = bidiReversedText;
    const wordEdges = searchAll(bidiReversedText, /(?:^|\s)/gmu);
    this._wordEdges = wordEdges;
    const [charWidths, charMetrics] = this.measureCharacters(bidiReversedText);
    this._characterWidths = charWidths;
    this._characterMetrics = charMetrics;
    const lines: [string, Rect2D][] = [];
    const charRects: Rect2D[] = [];
    const lineHeight = this.lineHeight;
    let lineWidth = 0;
    let prevLineBreak = 0;
    let y = 0;
    for (let i = 0; i < bidiReversedText.length; ++i) {
      const w = charWidths[i];
      if (lineWidth + w > width) {
        const prevWordBoundary = findValueBefore(i, wordEdges) || i;
        const line = bidiReversedText.substring(
          prevLineBreak,
          prevWordBoundary,
        );
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
    if (prevLineBreak < bidiReversedText.length) {
      const line = bidiReversedText.substring(
        prevLineBreak,
        bidiReversedText.length,
      );
      let actualWidth = 0;
      for (let j = prevLineBreak; j < bidiReversedText.length; ++j) {
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
    this._lines = lines;
    this._characterRects = charRects;
  }
}

function getBaseDirectionFromBidiLevels(levels: Uint8Array): WritingDirection {
  if (!levels.length) {
    return 'auto';
  }
  return (levels[0] || 0) % 2 === 1 ? 'rtl' : 'ltr';
}

function findValueBefore(desired: number, values: number[]): number {
  for (let i = 0; i < values.length; ++i) {
    if (values[i] > desired) {
      return i > 0 ? values[i - 1] : 0;
    }
  }
  return values[values.length - 1];
}
