import { useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import { useLocation } from 'https://esm.sh/react-router-dom@5.1.2';
import { useHistoryStatic } from './index.tsx';
import { QueryValue } from './query-string-manager.ts';

interface UseSyncUrlParamOptions {
  isReady?: boolean;
  route?: string;
}

export function useSyncUrlParam<IsArray extends boolean>(
  key: string,
  isArray: IsArray,
  value: QueryValue<IsArray>,
  mapQueryToState: (value: QueryValue<IsArray>) => void,
  options?: UseSyncUrlParamOptions
) {
  const { isReady = true, route } = options || {};
  const isMounting = useRef(true);
  const location = useLocation();
  const history = useHistoryStatic();
  const mapRef = useRef(mapQueryToState);
  const search = new URLSearchParams(location.search);
  const urlValue = search.get(key);
  const valueString = (
    isArray ? (value as string[])?.join(',') : value
  ) as string;

  const urlValueRef = useRef(urlValue);
  urlValueRef.current = urlValue;
  const valueStringRef = useRef(valueString);
  valueStringRef.current = valueString;

  const didLoadUrl = useRef(false);

  useEffect(() => {
    mapRef.current = mapQueryToState;
  }, [mapQueryToState]);

  useEffect(() => {
    if (!isReady || valueStringRef.current === urlValue || didLoadUrl.current) {
      return;
    }

    didLoadUrl.current = true;

    let pathname = history.$history.location.pathname;
    if (!pathname.startsWith('/')) {
      pathname = `/${pathname}`;
    }
    if (route && route !== pathname) {
      return;
    }

    valueStringRef.current = urlValue || '';
    mapRef.current(
      (isArray ? urlValue?.split(',') || [] : urlValue) as QueryValue<IsArray>
    );
  }, [isReady, urlValue, isArray, valueStringRef, key, history, route]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (isMounting.current) {
      isMounting.current = false;
      return;
    }
    const query = new URLSearchParams(history.$history.location.search);
    const urlVal = query.get(key);
    if (urlVal === valueString) {
      return;
    }

    urlValueRef.current = valueString;
    if (!valueString) {
      query.delete(key);
    } else {
      query.set(key, valueString);
    }

    history.$history.push({ search: query.toString() });
  }, [valueString, isReady, urlValueRef, history, key]);
}
