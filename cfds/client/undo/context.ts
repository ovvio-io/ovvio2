import { EqualOptions } from '../../../base/core-types/equals.ts';
import { isRichText } from '../../richtext/tree.ts';
import { GraphManager } from '../graph/graph-manager.ts';
import { MutationPack, mutationPackHasRemote } from '../graph/mutations.ts';
import { VertexManager, VertexSnapshot } from '../graph/vertex-manager.ts';
import { Vertex } from '../graph/vertex.ts';
import { SingleUndoManager } from './single.ts';

export interface UndoContextOptions {
  vertices?: UndoVertexOptions[];
  filters?: UndoFilterOptions[];
}

interface UndoVertexOptions {
  keys: string[] | Iterable<string>;
  filter?: (vertex: Vertex, mutations: MutationPack) => boolean;
  limit?: number;
  snapshotFields?: string[];
}

interface UndoFilterOptions {
  filter: (vertex: Vertex, mutations: MutationPack) => boolean;
  limit?: number;
  initialSnapshot?: VertexSnapshot;
  snapshotFields?: string[];
}

const equalsOptions: EqualOptions = {
  objectFilterFields: (key, obj) => {
    if (isRichText(obj)) {
      return key !== 'pointers';
    }
    if (key === 'lastModified' && obj[key] instanceof Date) {
      return false;
    }
    return true;
  },
};

/**
 * A context of undo single managers.
 * e.g in the editor: note title + note body + each children title.
 */
export class UndoContext {
  private _graph: GraphManager;
  private _keyOptions: Map<string, UndoVertexOptions>;
  private _filters: UndoFilterOptions[];
  private _undoMap: Map<string, SingleUndoManager>;

  private _curGroup: number;
  private _groupStarted: boolean;

  constructor(graph: GraphManager, options?: UndoContextOptions) {
    this._graph = graph;

    this._filters = options && options.filters ? options.filters : [];
    this._keyOptions = new Map<string, UndoVertexOptions>();
    this._undoMap = new Map<string, SingleUndoManager>();

    this._curGroup = 1;
    this._groupStarted = false;

    if (options && options.vertices) {
      for (const vOpt of options.vertices) {
        for (const key of vOpt.keys) {
          if (this._graph.hasVertex(key)) {
            this._keyOptions.set(key, vOpt);
            this._undoMap.set(
              key,
              new SingleUndoManager(this._graph.getVertexManager(key), {
                limit: vOpt.limit,
                equalsOptions,
                snapshotFields: vOpt.snapshotFields,
              })
            );
          } else {
            throw new Error(`Undo Vertices key: ${key} is not found in graph`);
          }
        }
      }
    }
  }

  dispose(): void {
    this._keyOptions.clear();
    this._filters = [];
    this._undoMap.clear();
    this._graph.undoManager.removeContext(this);
  }

  update(mutations: [VertexManager, MutationPack][]) {
    let changedLocally = false;
    for (const [vMng, pack] of mutations) {
      if (!this.isUpdateRelevant(vMng, pack)) continue;

      const undoManager = this._undoMap.get(vMng.key);
      if (undoManager === undefined) continue;

      if (mutationPackHasRemote(pack)) {
        undoManager.changedRemotely();
      } else {
        if (undoManager.changedLocally(this._curGroup)) {
          changedLocally = true;
        }
      }
    }

    if (changedLocally) {
      if (!this._groupStarted) this._curGroup++;
    }
  }

  private isUpdateRelevant(vMng: VertexManager, pack: MutationPack) {
    const keyOptions = this._keyOptions.get(vMng.key);
    if (keyOptions) {
      if (
        !keyOptions.filter ||
        keyOptions.filter(vMng.getVertexProxy(), pack)
      ) {
        return true;
      }
      return false;
    }

    for (const filter of this._filters) {
      if (filter.filter(vMng.getVertexProxy(), pack)) {
        if (!this._undoMap.has(vMng.key)) {
          this._undoMap.set(
            vMng.key,
            new SingleUndoManager(this._graph.getVertexManager(vMng.key), {
              limit: filter.limit,
              equalsOptions,
              initialSnapshot: filter.initialSnapshot,
              snapshotFields: filter.snapshotFields,
            })
          );
        }
        this._keyOptions.set(vMng.key, {
          keys: [vMng.key],
          filter: filter.filter,
          limit: filter.limit,
          snapshotFields: filter.snapshotFields,
        });
        return true;
      }
    }
    return false;
  }

  startGroup() {
    this._groupStarted = true;
    this._curGroup++;
  }

  endGroup() {
    this._groupStarted = false;
    this._curGroup++;
  }

  undo(): boolean {
    //find max group
    let maxGroup = 0;
    for (const manager of this._undoMap.values()) {
      const lastLocal = manager.lastLocalUndo;
      if (lastLocal.group > maxGroup) maxGroup = lastLocal.group;
    }

    if (maxGroup === 0) return false; //No Undo to run

    //Run Undo
    let result = false;
    for (const manager of this._undoMap.values()) {
      if (manager.lastLocalUndo.group === maxGroup) {
        if (manager.undo()) {
          result = true;
        }
      }
    }

    this._curGroup++;

    return result;
  }

  redo(): boolean {
    //find max group
    let maxGroup = 0;
    for (const manager of this._undoMap.values()) {
      const last = manager.lastRedo;
      if (last && last.group > maxGroup) maxGroup = last.group;
    }

    if (maxGroup === 0) return false; //No Redo to run

    //Run Undo
    let result = false;
    for (const manager of this._undoMap.values()) {
      if (manager.lastRedo?.group === maxGroup) {
        if (manager.redo()) {
          result = true;
        }
      }
    }

    this._curGroup++;

    return result;
  }
}
