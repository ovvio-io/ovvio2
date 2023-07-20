import { GraphManager } from '../graph/graph-manager.ts';
import { MutationPack } from '../graph/mutations.ts';
import { VertexManager } from '../graph/vertex-manager.ts';
import { UndoContext, UndoContextOptions } from './context.ts';

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
