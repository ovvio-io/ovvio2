import { useState, useEffect, useMemo, useRef } from 'react';
import { useCfdsClient, createCfdsProxy } from 'core/react-utils/cfds';
import SlateDocumentSerializer from './serializer2';
import SlateDocumentBuilder from './deserializer2';
// import { NotFound } from '@ovvio/cfds/base/errors';
import { Value, Point } from 'slate';

const EMPTY_VALUE = Value.fromJSON({
  object: 'value',
  document: {
    object: 'document',
    nodes: [
      {
        object: 'block',
        type: 'line',
        nodes: [
          {
            object: 'text',
            leaves: [
              {
                object: 'leaf',
                text: '',
                marks: [],
              },
            ],
          },
        ],
      },
    ],
  },
});

const taskRule = {
  nodes: [
    {
      match: [
        { object: 'text' },
        { type: 'assignee' },
        { type: 'assignee-anchor' },
        { type: 'tags-anchor' },
      ],
      // min: 1,
    },
  ],
};

const assigneeRule = {
  isVoid: true,
};

export const noteSchema = {
  blocks: {
    task: taskRule,
    'task-skeleton': {
      isVoid: true,
    },
  },
  inlines: {
    assignee: assigneeRule,
  },
};
export const taskSchema = {
  document: {
    nodes: [
      {
        match: { object: 'block' },
        min: 1,
        max: 1,
      },
    ],
  },
  blocks: {
    task: taskRule,
  },
  inlines: {
    assignee: assigneeRule,
  },
};

export const noteTitleSchema = {
  document: {
    nodes: [
      {
        match: { object: 'block' },
        min: 1,
        max: 1,
      },
    ],
  },
};

class ReferenceFetcher {
  constructor(cfdsClient, onMssingChanged) {
    this.cfdsClient = cfdsClient;
    this._missing = new Set();
    this._onMissingChanged = onMssingChanged;
    this._anyMissing = false;
    this._cancelled = false;
  }

  async _startFetching(key, retryCount = 0) {
    if (this._cancelled) {
      return;
    }
    try {
      await this.cfdsClient.getDoc(key);
      this._missing.delete(key);
      this._fireMissingChanged();
    } catch (err) {
      // TODO: find error
      if (err.message === 'NotFound') {
        window.setTimeout(() => {
          this._startFetching(key, retryCount + 1);
        }, Math.min(5000, retryCount * 1000));
      }
    }
  }

  _fireMissingChanged() {
    if (this._cancelled) {
      return;
    }
    const anyMissing = !!this._missing.size;
    if (anyMissing !== this._anyMissing) {
      this._anyMissing = anyMissing;
      this._onMissingChanged(this._anyMissing);
    }
  }

  _markMissing(key) {
    if (this._missing.has(key)) {
      return;
    }
    console.log(`${key} missing, fetching...`);
    this._missing.add(key);
    this._fireMissingChanged();
    this._startFetching(key);
  }

  fetch(key) {
    if (!this.cfdsClient.hasDoc(key)) {
      this._markMissing(key);
      return null;
    }

    return createCfdsProxy(
      this.cfdsClient,
      key,
      this.cfdsClient.getDocSync(key)
    );
  }
  close() {
    this._cancelled = true;
  }
}

export function useCollaborativeText(
  key,
  snapshot,
  propname,
  type = 'default',
  persistSelection = true
) {
  const cfdsClient = useCfdsClient();
  const [missing, setMissing] = useState(false);
  const references = useRef(new Set());

  const reload = useRef(() => {});
  const mounted = useRef(true);
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    return cfdsClient.registerGlobalListener((key, op, local) => {
      if (local) {
        return;
      }
      if (references.current.has(key)) {
        reload.current();
      }
    });
  }, [cfdsClient]);

  const referenceFetcher = useMemo(() => {
    if (cfdsClient) {
      return new ReferenceFetcher(cfdsClient, m => {
        console.log('Missing changed', m);
        setMissing(m);
        reload.current();
      });
    }
  }, [cfdsClient]);

  useEffect(() => {
    if (referenceFetcher) {
      return () => {
        referenceFetcher.close();
      };
    }
  }, [referenceFetcher]);

  const serializer = useMemo(
    () =>
      SlateDocumentSerializer.getSerializer(
        type,
        key => referenceFetcher && referenceFetcher.fetch(key)
      ),
    [type, referenceFetcher]
  );
  const deserializer = useMemo(
    () =>
      SlateDocumentBuilder.getBuilder(type, key => {
        references.current.add(key);
        return referenceFetcher && referenceFetcher.fetch(key);
      }),
    [type, referenceFetcher]
  );

  const [value, setValue] = useState(() => {
    if (snapshot && snapshot[propname] && deserializer) {
      const { doc, decorations } = deserializer.deserialize(
        snapshot[propname],
        true,
        { snapshot }
      );

      return Value.fromJSON({
        object: 'value',
        document: doc,
        decorations,
      });
    }
  });

  useEffect(() => {
    let cancelled = false;
    reload.current = () => {
      const snap = cfdsClient.getDocSync(key);
      const proxy = createCfdsProxy(cfdsClient, key, snap);
      if (cancelled) {
        return;
      }
      const { doc, decorations } = deserializer.deserialize(
        proxy[propname],
        true,
        proxy
      );
      if (cancelled) {
        return;
      }

      setValue(oldValue => {
        if (oldValue) {
          doc.key = oldValue.document.key;
        }

        let newValue = Value.fromJSON({
          object: 'value',
          document: doc,
          decorations,
          selection: {},
        });

        if (oldValue && persistSelection) {
          newValue = newValue.setSelection(oldValue.selection);
        }

        return newValue;
      });
    };
    return () => {
      cancelled = true;
    };
  }, [key, cfdsClient, deserializer, propname, persistSelection]);

  useEffect(() => {
    if (!key || !cfdsClient) {
      return;
    }
    cfdsClient.lockSync(key);
    reload.current();
    const unsub = cfdsClient.listen(key, (isLocal, changedKeys) => {
      if (isLocal) {
        return;
      }

      if (!changedKeys.includes(propname)) {
        return;
      }

      reload.current();
    });

    return () => {
      unsub();
      cfdsClient.unlock(key);
    };
  }, [cfdsClient, deserializer, propname, key]);

  const onChange = useMemo(() => {
    return change => {
      if (!mounted.current) {
        return;
      }
      const newRichtext = serializer.serialize(change.value.document, snapshot);

      snapshot[propname] = newRichtext;
      setValue(change.value);
    };
  }, [snapshot, propname, serializer]);

  return {
    value,
    onChange,
    missing,
    getReferences() {
      return Array.from(references.current).map(x => referenceFetcher.fetch(x));
    },
    reload() {
      reload.current();
    },
  };
}
