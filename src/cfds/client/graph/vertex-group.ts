import { Listenable, Listener } from '../../base/listenable';
import { GraphManager } from './graph-manager';
import { Vertex } from './vertex';
import { EVENT_DID_CHANGE } from './vertex-manager';

export default class VertexGroup extends Listenable<string> {
  private _graph: GraphManager;
  private _keys: Set<string>;
  private _notificationQueue: string[];
  private _eventHandlers: Map<string, any>;

  constructor(graph: GraphManager, keys?: string[]) {
    super();
    this._graph = graph;
    this._keys = new Set<string>(keys);

    this._notificationQueue = [];
    this._eventHandlers = new Map<string, any>();
  }

  get<V extends Vertex>(key: string): V {
    this.addKey(key);
    return this._graph.getVertex<V>(key);
  }

  get vertices() {
    return Array.from(this._keys).map(k => this._graph.getVertex(k));
  }

  addKey(key: string) {
    this._keys.add(key);
    if (this.hasListeners) {
      this._subscribeKey(key);
    }
  }

  removeKey(key: string) {
    this._keys.delete(key);
    if (this.hasListeners) {
      this._unSubscribeKey(key);
    }
  }

  waitForReady(readyCB: () => void, notReadyCB?: () => void, waitForSec = 10) {
    const isVertexReady = (key: string) => {
      const v = this._graph.getVertex(key);
      return !v.isLoading && v.errorCode === undefined;
    };

    let notReady = new Set();
    for (const key of this._keys) {
      if (!isVertexReady(key)) notReady.add(key);
    }

    if (notReady.size === 0) {
      readyCB();
    }
    let timeOut: NodeJS.Timeout;
    let remListen: () => void;

    const handler = (key: string) => {
      const isReady = isVertexReady(key);
      if (isReady && notReady.has(key)) {
        notReady.delete(key);
      } else if (!isReady) {
        notReady.add(key);
      }

      if (notReady.size === 0) {
        if (remListen) remListen();
        if (timeOut) clearTimeout(timeOut);
        readyCB();
      }
    };

    remListen = this.listen(handler);

    timeOut = setTimeout(() => {
      remListen();
      if (notReadyCB) notReadyCB();
    }, waitForSec * 1000);
  }

  protected beforeFirstListener(): void {
    this._subscribeKeys();
  }

  protected afterLastListener(): void {
    this._unSubscribeKeys();
  }

  private _subscribeKeys() {
    this._keys.forEach(key => {
      this._subscribeKey(key);
    });
  }

  private _unSubscribeKeys() {
    this._keys.forEach(key => {
      this._unSubscribeKey(key);
    });
  }

  private _subscribeKey(key: string) {
    const vManager = this._graph.getVertexManager(key);

    const handler = () => {
      this._notificationQueue.push(key);
      this.notify();
    };

    vManager.on(EVENT_DID_CHANGE, handler);
    this._eventHandlers.set(key, handler);
  }

  protected triggerListener(listener: Listener<string>): void {
    const not = this._notificationQueue.pop();
    if (!not) return;
    listener(not);
  }

  private _unSubscribeKey(key: string) {
    const handler = this._eventHandlers.get(key);
    if (!handler) return;

    const vManager = this._graph.getVertexManager(key);
    vManager.removeListener(EVENT_DID_CHANGE, handler);

    this._eventHandlers.delete(key);
  }
}
