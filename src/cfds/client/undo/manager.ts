import { GraphManager } from '../graph/graph-manager';
import { MutationPack } from '../graph/mutations';
import { VertexManager } from '../graph/vertex-manager';
import { UndoContext, UndoContextOptions } from './context';

export class UndoManager {
  private _graph: GraphManager;
  private _undoContexts: Set<UndoContext>;

  constructor(graph: GraphManager) {
    this._graph = graph;
    this._undoContexts = new Set<UndoContext>();
  }

  createContext(options?: UndoContextOptions): UndoContext {
    const context = new UndoContext(this._graph, options);
    this._undoContexts.add(context);
    return context;
  }

  removeContext(context: UndoContext): void {
    this._undoContexts.delete(context);
  }

  update(mutations: [VertexManager, MutationPack][]) {
    for (const context of this._undoContexts) {
      context.update(mutations);
    }
  }
}
