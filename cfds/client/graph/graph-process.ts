import { CoroutineScheduler } from '../coroutine';
import { EVENT_VERTEX_DID_CHANGE, GraphManager } from './graph-manager';
import { MutationPack } from './mutations';

export abstract class GraphProcess {
  private readonly _graph: GraphManager;
  private readonly _graphListener: (key: string, pack: MutationPack) => void;
  private _loading: boolean;
  private _closed: boolean;

  constructor(graph: GraphManager) {
    this._graph = graph;
    this._graphListener = (key: string, pack: MutationPack) => {
      this._vertexDidChange(key, pack);
    };
    this._loading = true;
    this._closed = false;

    graph.on(EVENT_VERTEX_DID_CHANGE, this._graphListener);
    CoroutineScheduler.sharedScheduler().schedule(this._initialLoadCoroutine());
  }

  protected abstract _vertexDidChange(key: string, pack: MutationPack): void;

  protected onLoadingFinished(): void {}

  private *_initialLoadCoroutine(): Generator<void> {
    for (const mgr of this._graph.vertexManagers()) {
      if (this._closed) {
        return;
      }
      this._vertexDidChange(mgr.key, mgr.getCurrentStateMutations(true));
      yield;
    }
    if (this._closed) {
      return;
    }
    this._loading = false;
    this.onLoadingFinished();
  }
}
