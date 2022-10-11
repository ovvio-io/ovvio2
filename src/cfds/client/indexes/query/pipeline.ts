import { Listenable, Listener } from '../../../base/listenable';
import { IVertex } from '../../graph/types';
import { IQuery } from '../types';

export interface PipelineStep<I extends IVertex, O extends IVertex> {
  (input: IQuery<I>): IQuery<O>;
}

export class Pipeline<I extends IVertex, O extends IVertex> extends Listenable<
  Pipeline<I, O>
> {
  private _firstStep: IQuery<any>;
  private _steps: PipelineStep<any, any>[];
  private _removers: (() => void)[] | undefined;
  private _queries: IQuery<any>[] | undefined;

  constructor(firstStep: IQuery<I>, ...steps: PipelineStep<any, any>[]) {
    super();
    this._firstStep = firstStep;
    this._steps = steps;
  }

  get query(): IQuery<O> {
    if (this._queries === undefined) {
      this.rebuildQueries();
    }
    const queries = this._queries!;
    return queries[queries.length - 1];
  }

  private rebuildQueries(): void {
    this.cleanupQueryListeners();
    const queries: Array<IQuery<any>> = [this._firstStep];
    for (const s of this._steps) {
      const befQuery = queries[queries.length - 1];
      befQuery.cursor.reset();
      queries.push(s(befQuery));
    }
    this._queries = queries;
  }

  private cleanupQueryListeners() {
    if (this._removers) {
      for (const r of this._removers) {
        r();
      }
      this._removers = undefined;
    }
  }

  private reload(): void {
    this.rebuildQueries();
    this._removers = this._queries
      ? this._queries.map(q =>
          q.listen(() => {
            this.reload();
            this.notify();
          }, false)
        )
      : undefined;
  }

  protected beforeFirstListener(): void {
    this.reload();
  }

  protected triggerListener(listener: Listener<Pipeline<I, O>>): void {
    listener(this);
  }

  protected afterLastListener(): void {
    this.cleanupQueryListeners();
  }
}
