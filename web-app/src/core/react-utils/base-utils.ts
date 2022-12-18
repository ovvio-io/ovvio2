import { useEffect, useRef } from 'https://esm.sh/react@18.2.0';

export function useMountedIndicator() {
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
}
