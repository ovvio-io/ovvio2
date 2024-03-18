/*
 * Code taken from https://medium.com/deno-the-complete-reference/progress-indicator-for-cli-apps-in-deno-4d193a9812af
 * and modified to do synchronous IO.
 */

export const enum ProgressIndicatorType {
  BAR,
  PERCENT,
  DOTS,
}

export class ProgressIndicator {
  private numUnits: number;
  private nextUpdateTS: number = Date.now();
  private enc: TextEncoder = new TextEncoder();
  private type: ProgressIndicatorType;
  private updateInterval: number = 100;
  private dotsCounter: number = 0;
  private updateFn;

  constructor(
    type: ProgressIndicatorType = ProgressIndicatorType.DOTS,
    numUnits: number = 0,
  ) {
    this.type = type;
    switch (this.type) {
      case ProgressIndicatorType.BAR:
        this.updateFn = this.updateBars;
        this.numUnits = numUnits || 50;
        break;

      case ProgressIndicatorType.PERCENT:
        this.updateFn = this.updatePct;
        this.numUnits = 0;
        break;

      case ProgressIndicatorType.DOTS:
        this.updateFn = this.updateDots;
        this.numUnits = numUnits || 5;
        break;
    }
  }

  private writeString(s: string) {
    Deno.stdout.writeSync(this.enc.encode(s));
  }

  private updateDots(_t: number, _c: number = 0) {
    this.dotsCounter =
      ++this.dotsCounter > this.numUnits ? 0 : this.dotsCounter;
    this.writeString('\rReading ');
    for (let i = 0; i < this.numUnits; i++)
      i <= this.dotsCounter ? this.writeString('.') : this.writeString(' ');
  }

  private updateBars(t: number, c: number = 0) {
    const progChunkSize = Math.round(t / this.numUnits);
    const numProgBars = Math.round(c / progChunkSize);
    this.writeString('\r|');
    for (let i = 0; i < this.numUnits; i++)
      i <= numProgBars ? this.writeString('█') : this.writeString('░');
    this.writeString('| ');
    const pct = ((c / t) * 100).toFixed(0);
    this.writeString(pct + '%');
  }

  private updatePct(t: number, c: number = 0) {
    const pct = ((c / t) * 100).toFixed(0);
    this.writeString('\rCompleted ' + pct + '%');
  }

  public update(t: number, c: number = 0) {
    const currTS = Date.now();
    if (c < t && currTS < this.nextUpdateTS) {
      return;
    }
    this.updateFn(t, c);
    this.nextUpdateTS = currTS + this.updateInterval;
  }
}
