import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';

export interface TextStyle {
  strikethrough: boolean;
  color: string;
  strikeColor: string;
  lineSpacing: number;
}

export class ParagraphRendererContext implements TextStyle {
  private _nodes: SpanNode[] = [];
  private _font = '13px Poppins, Heebo';
  private _lineHeight = 13;
  private _needsMeasure = true;

  private _characterWidths: readonly number[] | undefined;
  private _wordEdges: readonly number[] | undefined;
  private _lines: readonly (readonly [string, Rect2D])[] | undefined;
  private _characterRects: Rect2D[] | undefined;
  private _characterMetrics: TextMetrics[] | undefined;
  private _bidiReversedText: string | undefined;
  private _bidiEmbeddingLevels: GetEmbeddingLevelsResult | undefined;
  private _strikethrough = false;
  private _color: string = theme.mono.m10;
  private _strikeColor: string = theme.mono.m4;
  private _lineSpacing: number = styleguide.gridbase / 2;

  constructor(readonly canvas: HTMLCanvasElement) {}

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  get lineCount(): number {
    return this._lines?.length || 0;
  }

  get lines(): readonly (readonly [string, Rect2D])[] {
    return this._lines || [];
  }

  get characterRects(): Rect2D[] {
    return this._characterRects || [];
  }

  get characterWidths(): readonly number[] {
    return this._characterWidths || [];
  }

  get bidiReversedText(): string | undefined {
    return this._bidiReversedText;
  }

  get nodes(): SpanNode[] {
    return this._nodes;
  }

  set nodes(n: SpanNode[]) {
    if (!coreValueEquals(n, this._nodes)) {
      this._nodes = n;
      this.redraw();
    }
  }

  get writingDirection(): WritingDirection {
    const levels = this._bidiEmbeddingLevels;
    return levels ? getBaseDirectionFromBidiLevels(levels.levels) : 'auto';
  }

  get font(): string {
    return this._font;
  }

  set font(s: string) {
    if (this._font !== s) {
      this._font = s;
      this.redraw();
    }
  }

  get lineHeight(): number {
    return this._lineHeight;
  }

  set lineHeight(h: number) {
    if (h !== this._lineHeight) {
      this._lineHeight = h;
      this.redraw();
    }
  }

  get lineSpacing(): number {
    return this._lineSpacing;
  }

  set lineSpacing(s: number) {
    if (s !== this._lineSpacing) {
      this._lineSpacing = s;
      this.redraw();
    }
  }

  get strikethrough(): boolean {
    return this._strikethrough;
  }

  set strikethrough(v: boolean) {
    if (this._strikethrough !== v) {
      this._strikethrough = v;
      this.render();
    }
  }

  get color(): string {
    return this._color;
  }

  set color(c: string) {
    if (this._color !== c) {
      this._color = c;
      this.render();
    }
  }

  get strikeColor(): string {
    return this._strikeColor;
  }

  set strikeColor(c: string) {
    if (this._strikeColor !== c) {
      this._strikeColor = c;
      this.render();
    }
  }

  private redraw(): void {
    this._needsMeasure = true;
    this.render();
  }

  render(): void {
    this.measureIfNeeded();
    const ctx = this.canvas.getContext('2d')!;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.applyStylesToCanvas();
    // ctx.scale(1, -1);
    // ctx.translate(0, -this.height);
    ctx.scale(this.pixelRatio, this.pixelRatio);
    // ctx.strokeRect(0, 0, this.width, this.height);
    // ctx.fillRect(0, 0, 5, 5);
    const rtl = this.writingDirection === 'rtl';
    for (const [lineText, bounds] of this._lines!) {
      const x = bounds.x + (rtl ? bounds.width : 0);
      ctx.fillStyle = this.color;
      ctx.fillText(lineText, x, bounds.y + bounds.height, bounds.width);
      if (this.strikethrough) {
        const y = bounds.y + bounds.height / 2;
        const strikeWidth = 1;
        ctx.fillStyle = this.strikeColor;
        ctx.fillRect(
          bounds.x,
          y - strikeWidth / 2 - 1,
          bounds.width,
          strikeWidth,
        );
      }
    }
    ctx.restore();
  }

  private applyStylesToCanvas(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.font = this.font;
    ctx.textBaseline = 'bottom';
  }

  get pixelRatio(): number {
    return Math.max(2, devicePixelRatio);
  }

  measureIfNeeded(): void {
    if (this._needsMeasure) {
      this.measure();
    }
  }

  measure(): void {
    const canvas = this.canvas;
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || 0;
    const pixelRatio = this.pixelRatio;
    canvas.width = w * pixelRatio;
    this.measureText();
    const h =
      Math.max(1, this.lineCount) * (this.lineHeight + 2) +
      this.lineSpacing * Math.max(0, this.lineCount - 1);
    canvas.height = h * pixelRatio;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    this._needsMeasure = false;
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
  private measureCharacters(text: string): [number[], TextMetrics[]] {
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
    if (!this.nodes?.length) {
      return;
    }
    const text = this.nodes[0].text;
    const width = this.width / this.pixelRatio;
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
        y += lineHeight + this.lineSpacing;
      } else {
        lineWidth += w;
      }
    }
    if (prevLineBreak < bidiReversedText.length) {
      const line = text.substring(prevLineBreak, bidiReversedText.length);
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
          x: dir === 'rtl' ? width - actualWidth : 0,
          y,
          width: actualWidth,
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

const gCanvasToRendererMap = new WeakMap<
  HTMLCanvasElement,
  ParagraphRendererContext
>();

export function getParagraphRenderer(
  canvas: HTMLCanvasElement,
): ParagraphRendererContext | undefined {
  return gCanvasToRendererMap.get(canvas);
}

export type ParagraphRendererParams = {
  element: MarkupElement;
} & React.CanvasHTMLAttributes<HTMLCanvasElement> &
  Partial<TextStyle>;

export function ParagraphRenderer({
  element,
  strikethrough,
  ...rest
}: ParagraphRendererParams) {
  const ref = useRef(null);
  const [ctx, setCtx] = useState<ParagraphRendererContext | undefined>();
  useLayoutEffect(() => {
    if (ctx?.canvas !== ref.current && ref.current) {
      const ctx = new ParagraphRendererContext(ref.current);
      gCanvasToRendererMap.set(ref.current, ctx);
      setCtx(ctx);
    }
  });
  if (ctx) {
    ctx.nodes = element.children as SpanNode[];
  }
  // useEffect(render);
  // Force initial measurement and rendering
  useEffect(() => {
    let t: number | undefined = setTimeout(() => {
      ctx?.render();
      t = undefined;
    }, 16);
    return () => {
      if (t) {
        clearTimeout(t);
        t = undefined;
      }
    };
  }, []);
  // useEffect(() => {
  //   addEventListener('resize', render);
  //   return () => {
  //     removeEventListener('resize', render);
  //   };
  // }, [render]);

  useEffect(() => {
    if (!ctx) {
      return;
    }
    const observer = new ResizeObserver(() => ctx.render());
    observer.observe(ctx.canvas);
    return () => {
      observer.disconnect();
    };
  }, [ctx]);
  if (ctx) {
    ctx.strikethrough = strikethrough === true;
  }
  ctx?.render();
  return <canvas ref={ref} {...rest} />;
}
