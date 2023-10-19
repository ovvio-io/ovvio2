import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import { notImplemented } from '../../../../base/error.ts';
import { Note } from '../../../../cfds/client/graph/vertices/note.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';

export type RoutableDocument = Note;

function resolveUrl(
  doc: RoutableDocument | VertexManager<RoutableDocument>
): string {
  const vertex = doc instanceof VertexManager ? doc.getVertexProxy() : doc;
  if (vertex instanceof Note) {
    return `/${vertex.workspaceKey}/notes/${vertex.key}`;
  }
  return notImplemented();
}

function createDocumentRouter(navigate: NavigateFunction) {
  return {
    goTo(doc: RoutableDocument | VertexManager<RoutableDocument>): void {
      const link = resolveUrl(doc);
      navigate(link);
    },
    urlFor(doc: RoutableDocument | VertexManager<RoutableDocument>): string {
      return resolveUrl(doc);
    },
  };
}

export function useDocumentRouter() {
  const navigate = useNavigate();
  return createDocumentRouter(navigate);
}

export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handler = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    addEventListener('resize', handler);
    return () => {
      removeEventListener('resize', handler);
    };
  }, []);

  return size;
}

export function useElementSize(element: HTMLElement) {
  const [size, setSize] = useState(() => {
    const boundingBox = element && element.getBoundingClientRect();
    return {
      width: boundingBox ? boundingBox.width : 0,
      height: boundingBox ? boundingBox.height : 0,
    };
  });

  useLayoutEffect(() => {
    const handler = () => {
      const boundingBox = element && element.getBoundingClientRect();

      setSize({
        width: boundingBox ? boundingBox.width : 0,
        height: boundingBox ? boundingBox.height : 0,
      });
    };

    addEventListener('resize', handler);
    handler();
    return () => {
      removeEventListener('resize', handler);
    };
  }, [element]);

  return size;
}

export function useRenderLogging() {
  const stack = new Error().stack;
  const componentName = stack?.split('\n')[2].trim().split(' ')[1];

  useEffect(() => {
    if (componentName) {
      console.log(`${componentName} - Rendered`);
    }
  });
}

// export function useTraceUpdate(props: any) {
//   const prevProps = useRef(props);
//   const stack = new Error().stack;

//   const componentName = stack?.split('\n')[2].trim().split(' ')[1];
//   useEffect(() => {
//     const changedProps = Object.entries(props).reduce((ps, [k, v]) => {
//       if (prevProps.current[k] !== v) {
//         ps[k] = [prevProps.current[k], v];
//       }
//       return ps;
//     }, {});
//     if (Object.keys(changedProps).length > 0) {
//       console.log(`${componentName} changed props: `, changedProps);
//     }
//     prevProps.current = props;
//   });
// }

// export function useReffedContext(context) {
//   const val = useContext(context);
//   const ref = useRef(val);
//   useEffect(() => {
//     ref.current = val;
//   }, [val]);
//   return ref;
// }

export function useReffedValue<T>(val: T): React.MutableRefObject<T> {
  const ref = useRef(val);
  useEffect(() => {
    ref.current = val;
  }, [val]);
  return ref;
}

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

export function useFocusOnMount<T extends HTMLElement>(
  ref: React.RefObject<T>
) {
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, [ref]);
}
