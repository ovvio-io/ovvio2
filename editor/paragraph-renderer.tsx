import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { numbersEqual } from '../base/comparisons.ts';
import { coreValueEquals } from '../base/core-types/equals.ts';
import { assert } from '../base/error.ts';
import { Rect2D } from '../base/math.ts';
import { WritingDirection, searchAll } from '../base/string.ts';
import { MarkupElement, SpanNode } from '../cfds/richtext/model.ts';
import {
  GetEmbeddingLevelsResult,
  getEmbeddingLevels,
} from '../external/bidi-js/embeddingLevels.js';
import { getReorderedString } from '../external/bidi-js/index.js';

export class ParagraphRendererContext {
  private _nodes: SpanNode[] = [];
  private _font = '13px Poppins, Heebo';
  private _lineHeight = 13;
  private _dirty = true;

  private _characterWidths: readonly number[] | undefined;
  private _wordEdges: readonly number[] | undefined;
  private _lines: readonly (readonly [string, Rect2D])[] | undefined;
  private _characterRects: Rect2D[] | undefined;
  private _characterMetrics: TextMetrics[] | undefined;
  private _bidiReversedText: string | undefined;
  private _bidiEmbeddingLevels: GetEmbeddingLevelsResult | undefined;

  constructor(readonly canvas: HTMLCanvasElement) {}

  get width(): number {
    debugger;
    return this.canvas.width;
  }

  get nodes(): SpanNode[] {
    return this._nodes;
  }

  set nodes(n: SpanNode[]) {
    if (!coreValueEquals(n, this._nodes)) {
      this._nodes = n;
      this._dirty = true;
    }
  }

  get font(): string {
    return this._font;
  }

  set font(s: string) {
    if (this._font !== s) {
      this._font = s;
      this._dirty = true;
    }
  }

  get lineHeight(): number {
    return this._lineHeight;
  }

  set lineHeight(h: number) {
    if (h !== this._lineHeight) {
      this._lineHeight = h;
      this._dirty = true;
    }
  }

  render(): void {
    const ctx = this.canvas.getContext('2d')!;
    this.applyStylesToCanvas();
    for (const [lineText, bounds] of this._lines!) {
      ctx.fillText(lineText, bounds.x, bounds.y, bounds.width);
    }
    this._dirty = false;
  }

  renderIfNeeded(): void {
    debugger;
    if (this._dirty) {
      this.measureText();
      this.render();
    }
  }

  private applyStylesToCanvas(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.font = this.font;
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
    const ctx = this.canvas.getContext('2d')!;
    ctx.save();
    this.applyStylesToCanvas();
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
    ctx.restore();
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
        debugger;
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

export type ParagraphRendererParams = {
  element: MarkupElement;
} & React.CanvasHTMLAttributes<HTMLCanvasElement>;

export function ParagraphRenderer({
  element,
  ...rest
}: ParagraphRendererParams) {
  const ref = useRef(null);
  const [renderCount, setRenderCount] = useState(0);
  const ctx = useMemo(() => {
    debugger;
    if (!ref.current) {
      return;
    }
    return new ParagraphRendererContext(ref.current);
  }, [renderCount]);

  useLayoutEffect(() => {
    if (!ref.current || !ctx || ctx.canvas !== ref.current) {
      setRenderCount(renderCount + 1);
    }
  });

  useLayoutEffect(() => {
    debugger;
    if (ctx) {
      ctx.nodes = element.children as SpanNode[];
      ctx.renderIfNeeded();
    }
  }, [element.children, ctx]);
  return <canvas ref={ref} {...rest} />;
}
