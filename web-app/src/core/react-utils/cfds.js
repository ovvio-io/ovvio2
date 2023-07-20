import React, { useContext } from 'react';

const QUERY = {
  where() {
    return QUERY;
  },
  and() {
    return QUERY;
  },
  eq() {
    return QUERY;
  },
  sort() {
    return QUERY;
  },
};

export function Query() {
  return QUERY;
}

const CFDSContext = React.createContext({
  cfdsClient: null,
  queryEngine: null,
});

function useCfdsClient() {
  return useContext(CFDSContext).cfdsClient;
}

export function useBatchedCfdsObjects() {
  return {
    result: [],
    loading: true,
    error: null,
  };
}

export function useQueryListener() {
  return {
    isLoading: true,
    error: null,
    result: [],
    reload: () => {},
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

export function useCfdsObject() {
  return {
    error: null,
    snapshot: null,
    isLoading: true,
    reload: () => {},
  };
}
