import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useReducer,
  useRef,
} from 'react';
// import { ClientDiffSync, OP_MOD } from '@ovvio/cfds/client/client';
import { RESTNetworkAdapter } from '@ovvio/cfds/client/network_adapter';
// import Query from '@ovvio/cfds/base/query';
import config from 'core/config';
import ClientQueryEngine from '../client-query-engine';
import Utils from '@ovvio/base/lib/utils';
// import { IncompatibleProtocolError } from '@ovvio/cfds/base/errors';
import VersionMismatchView from 'app/version-mismatch';
import { isElectron } from '../../electronUtils';
import { useEventLogger } from 'core/analytics';

export const CFDSContext = React.createContext({
  cfdsClient: null,
  queryEngine: null,
});
// export { Query };
function useCfdsClient() {
  return useContext(CFDSContext).cfdsClient;
}

export function CfdsClientProvider({ user, children }) {
  const [forceRefresh, setForceRefresh] = useState(false);
  const eventLogger = useEventLogger();

  const cfdsClient = useMemo(() => {
    if (!user) {
      return null;
    }
    return createCfdsClient(user, {
      onError: err => {
        // TODO: IncompatibleProtocolError
        if (err.message === 'IncompatibleProtocolError') {
          if (isElectron()) {
            window.require('electron').ipcRenderer.send('check_update');
          }
          setForceRefresh(true);
          return true;
        }
      },
    });
  }, [user]);
  useEffect(() => {
    if (!cfdsClient) {
      return;
    }

    const interval = window.setInterval(() => {
      // console.log('sync started');
      cfdsClient
        .sync()
        .then(() => /*console.log('sync completed')*/ null)
        .catch(e => console.error(e));
    }, 50);
    const handler = e => {
      if (!cfdsClient.hasLocalChanges) {
        return;
      }

      if (isElectron()) {
        if (
          window
            .require('electron')
            .ipcRenderer.sendSync('closing-with-local-changes')
        ) {
          return;
        }
      }

      e.preventDefault();
      const msg =
        'It looks like you have been editing something. ' +
        'If you leave before saving, your changes will be lost.';
      e.returnValue = msg;
      return msg;
    };

    const unloadHandler = e => {
      eventLogger.action('SESSION_END');
      eventLogger.close();
    };

    window.addEventListener('beforeunload', handler);
    window.addEventListener('unload', unloadHandler);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('unload', unloadHandler);
    };
  }, [cfdsClient]);

  const value = useMemo(() => {
    const context = {
      cfdsClient,
      queryEngine: null,
    };
    if (cfdsClient) {
      context.queryEngine = new ClientQueryEngine(cfdsClient);
    }
    return context;
  }, [cfdsClient]);

  if (forceRefresh) {
    return <VersionMismatchView />;
  }

  if (!cfdsClient) {
    return null;
  }

  return <CFDSContext.Provider value={value}>{children}</CFDSContext.Provider>;
}

export function getDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = Utils.uniqueId();
    localStorage.setItem('deviceId', id);
  }
  return id;
}

export function createCfdsClient(user, { onError }) {
  const deviceId = getDeviceId();
  const networkAdapter = new RESTNetworkAdapter(config.diffServer, {
    credentialsProvider: user,
    clientId: deviceId,
    onError,
  });
  networkAdapter.checkProtocolVersion();
  // return new ClientDiffSync(
  //   new MemDocStorage(),
  //   networkAdapter,
  //   `${user.id}/${deviceId}`
  // );
}

function itemsReducer(state, action) {
  switch (action.type) {
    case 'loading': {
      return {
        result: [],
        loading: true,
        error: null,
      };
    }
    case 'error': {
      return {
        result: [],
        loading: false,
        error: action.payload,
      };
    }
    case 'result': {
      return {
        result: action.payload,
        loading: false,
        error: null,
      };
    }
    case 'update_item': {
      return {
        result: state.result.map(x => {
          if (x.key !== action.payload.key) {
            return x;
          }
          return action.payload;
        }),
      };
    }
    default: {
      throw new Error(`Unknown action type ${action.type}`);
    }
  }
}

export function useBatchedCfdsObjects(keys, opts = {}) {
  const cfdsClient = useCfdsClient();
  const optsRef = useRef(opts);
  const [state, dispatch] = useReducer(itemsReducer, {
    result: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!cfdsClient || !optsRef.current.listener || !keys || !keys.length) {
      return;
    }
    return cfdsClient.registerGlobalListener(
      (key, op, isLocal, changedKeys) => {
        //op !== OP_MOD ||
        if (!keys.includes(key)) {
          return;
        }

        optsRef.current.listener(key, isLocal, changedKeys, cfdsClient);
      }
    );
  }, [cfdsClient, JSON.stringify(keys)]);

  useEffect(() => {
    const abortController = new AbortController();

    dispatch({
      type: 'loading',
    });

    let cleanup = () => {};
    (async () => {
      try {
        const cfdsItems = await getMultipleObjects(cfdsClient, keys, {
          lock: true,
          listener: (key, isLocal, changedKeys) => {
            if (abortController.signal.aborted) {
              return;
            }
            if (!changedKeys || !changedKeys.length) {
              return;
            }
            if (
              !changedKeys ||
              !optsRef.current.dependantProperties ||
              changedKeys.some(x =>
                optsRef.current.dependantProperties.includes(x)
              )
            ) {
              const docRef = {
                key,
                snapshot: createCfdsProxy(
                  cfdsClient,
                  key,
                  cfdsClient.getDocSync(key)
                ),
              };

              dispatch({
                type: 'update_item',
                payload: docRef,
              });
            }
          },
          signal: abortController.signal,
        });
        if (abortController.signal.aborted) {
          return;
        }
        cleanup = cfdsItems.cleanup;

        dispatch({
          type: 'result',
          payload: cfdsItems.items,
        });
      } catch (e) {
        if (e.name === 'AbortError' || abortController.signal.aborted) {
          return;
        }
        dispatch({
          type: 'error',
          payload: e,
        });
      }
    })();
    return () => {
      abortController.abort();
      cleanup();
    };
  }, [cfdsClient, JSON.stringify(keys)]);
  return state;
}

function queryReducer(state, action) {
  const { payload, type } = action;

  switch (type) {
    case 'loading':
      return {
        isLoading: true,
        error: null,
        result: [],
      };
    case 'error':
      return {
        isLoading: false,
        error: payload,
        result: [],
      };
    case 'result':
      return {
        isLoading: false,
        error: null,
        result: payload,
      };
    case 'update_item':
      return {
        isLoading: false,
        error: null,
        result: state.result.map(x => {
          if (x.key === payload.key) {
            return payload;
          }
          return x;
        }),
      };
    default:
      throw new Error(`Unknown action type ${action.type}`);
  }
}
function queryEquality(query) {
  return JSON.stringify(query.toJS());
}
export function useQueryListener(query) {
  const cleanupMap = useRef(new Map());
  const cleanup = useRef(() => {
    for (let cleanupFn of cleanupMap.current.values()) {
      cleanupFn();
    }
    cleanupMap.current = new Map();
  });
  const [reload, setReload] = useState(0);
  const [state, dispatch] = useReducer(queryReducer, {
    isLoading: true,
    error: null,
    result: [],
  });

  const previousState = useRef(state);
  useEffect(() => {
    previousState.current = state;
  }, [state]);

  const { queryEngine, cfdsClient } = useContext(CFDSContext);

  const setSnapshot = useCallback(
    (snapshot, signal) => {
      const items = [];
      const oldItems = [...previousState.current.result];
      const newCleanups = new Map();
      for (let item of snapshot.items) {
        let existing;
        for (let i = 0; i < oldItems.length; i++) {
          if (oldItems[i].key === item.key) {
            existing = oldItems[i];
            oldItems.splice(i, 1);
            break;
          }
        }
        if (existing) {
          items.push(existing);
          const clean = cleanupMap.current.get(existing.key);
          cleanupMap.current.delete(existing.key);
          newCleanups.set(existing.key, clean);
        } else {
          cfdsClient.lockSync(item.key);
          items.push({
            key: item.key,
            snapshot: createCfdsProxy(cfdsClient, item.key, item.document),
          });
          const unsub = cfdsClient.listen(item.key, () => {
            if (signal && signal.aborted) {
              return;
            }
            dispatch({
              type: 'update_item',
              payload: {
                key: item.key,
                snapshot: createCfdsProxy(
                  cfdsClient,
                  item.key,
                  cfdsClient.getDocSync(item.key)
                ),
              },
            });
          });
          newCleanups.set(item.key, () => {
            unsub();
            cfdsClient.unlock(item.key);
          });
        }
      }
      cleanup.current();
      cleanupMap.current = newCleanups;
      dispatch({
        type: 'result',
        payload: items,
      });
    },
    [cfdsClient]
  );
  useEffect(() => {
    if (!queryEngine || !query) {
      return;
    }
    const abortController = new AbortController();

    dispatch({
      type: 'loading',
    });

    const unsub = queryEngine.listen(
      query,
      snapshot => {
        if (abortController.signal.aborted) {
          return;
        }
        setSnapshot(snapshot, abortController.signal);
      },
      () => {
        if (abortController.signal.aborted) {
          return;
        }

        cleanup.current();
        dispatch({
          type: 'loading',
        });
      },
      err => {
        if (abortController.signal.aborted) {
          return;
        }
        cleanup.current();
        dispatch({
          type: 'error',
          payload: err,
        });
      }
    );

    return () => {
      unsub();
      abortController.abort();
    };
  }, [queryEngine, queryEquality(query), setSnapshot, reload]);
  useEffect(() => {
    return () => {
      cleanup.current();
    };
  }, []);
  return {
    ...state,
    reload: () => setReload(x => x + 1),
  };
}

export function createCfdsProxy(cfdsClient, key, snapshot) {
  return new Proxy(snapshot, {
    get: (obj, prop) => {
      if (prop === '$document') {
        return obj;
      }
      if (prop === 'clearField') {
        return fieldName => {
          delete obj.data[fieldName];
          cfdsClient.setDocSync(key, obj);
        };
      }
      return obj.get(prop);
    },
    set: (obj, prop, value) => {
      if (prop === 'title' && typeof value === 'undefined') {
        debugger;
      }
      obj.set(prop, value);
      cfdsClient.setDocSync(key, obj);

      return true;
    },
  });
}

async function getCfdsObject(cfdsClient, key, { lock, listener, signal }) {
  let doc;
  if (cfdsClient.hasDoc(key)) {
    doc = cfdsClient.getDocSync(key);
  } else {
    doc = await cfdsClient.getDoc(key);
  }
  let unlock = () => {};
  let unsub = () => {};
  let clean = false;

  if (signal && signal.aborted) {
    return {
      cleanup: () => {},
    };
  }

  if (lock) {
    cfdsClient.lockSync(key);
    unlock = () => {
      cfdsClient.unlock(key);
    };
  }
  if (listener) {
    if (!lock) {
      debugger;
    }
    unsub = cfdsClient.listen(key, (isLocal, changedKeys) => {
      if (signal && signal.aborted) {
        return;
      }
      return listener(isLocal, changedKeys);
    });
  }

  return {
    key,
    snapshot: createCfdsProxy(cfdsClient, key, doc),
    cleanup: () => {
      if (clean) {
        return;
      }
      unsub();
      unlock();
      clean = true;
    },
  };
}

async function getMultipleObjects(
  cfdsClient,
  keys,
  { lock, listener, signal }
) {
  const results = await Promise.all(
    keys.map(async key => {
      let l;
      if (listener) {
        l = (...args) => {
          listener(key, ...args);
        };
      }

      return getCfdsObject(cfdsClient, key, {
        lock,
        listener: l,
        signal,
      });
    })
  );

  if (signal && signal.aborted) {
    results.forEach(x => {
      x.cleanup();
    });
    return {
      items: [],
      cleanup: () => {},
    };
  }

  return {
    items: results,
    cleanup: () => {
      results.forEach(x => x.cleanup());
    },
  };
}

export function useCfdsObject(key, { dependantProperties } = {}) {
  const cfdsClient = useCfdsClient();
  const previousKey = useRef(key);

  const [snapshot, setSnapshot] = useState(() => {
    if (!cfdsClient && !key) {
      return null;
    }
    if (!cfdsClient.hasDoc(key)) {
      return null;
    }
    return createCfdsProxy(cfdsClient, key, cfdsClient.getDocSync(key));
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (!cfdsClient && !key) {
      return true;
    }
    return !cfdsClient.hasDoc(key);
  });

  const [error, setError] = useState(null);

  const [reload, setReload] = useState(0);

  useEffect(() => {
    previousKey.current = key;
    if (!cfdsClient || !key) {
      setSnapshot(null);
      setIsLoading(true);
      setError(null);
      return;
    }
    setError(null);
    const abortController = new AbortController();
    let cleanup = () => {};
    (async () => {
      try {
        const obj = await getCfdsObject(cfdsClient, key, {
          lock: true,
          listener: (isLocal, changedKeys) => {
            if (abortController.signal.aborted) {
              return;
            }
            if (!changedKeys || !changedKeys.length) {
              console.log('empty keys');
              return;
            }
            if (
              !changedKeys ||
              !dependantProperties ||
              changedKeys.some(x => dependantProperties.includes(x))
            ) {
              setSnapshot(
                createCfdsProxy(cfdsClient, key, cfdsClient.getDocSync(key))
              );
            }
          },
          signal: abortController.signal,
        });
        cleanup = obj.cleanup;
        if (!abortController.signal.aborted) {
          setSnapshot(obj.snapshot);
          setIsLoading(false);
        } else {
          cleanup();
          cleanup = () => {};
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(e);
          setIsLoading(false);
          setSnapshot(null);
        }
      }
    })();
    return () => {
      abortController.abort();
      cleanup();
    };
  }, [cfdsClient, key, dependantProperties, reload]);

  return {
    error,
    snapshot,
    isLoading: isLoading || key !== previousKey.current,
    reload: () => setReload(x => x + 1),
  };
}
