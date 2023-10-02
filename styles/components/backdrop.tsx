import React, { useCallback, useEffect, useRef, useState } from "react";
import { styleguide } from "../styleguide.ts";
import { layout } from "../layout.ts";
import Layer from "./layer.tsx";
import { makeStyles, cn, keyframes } from "../css-objects/index.ts";
import { createUniversalPortal } from "../utils/ssr.ts";

const hideAnim = keyframes(
  {
    from: {
      opacity: 1,
      transform: "translateY(0)",
    },
    to: {
      opacity: 0,
      transform: "translateY(-50%)",
    },
  },
  "backdrop_dd7122"
);

const backdropShow = keyframes(
  {
    from: {
      opacity: 0,
    },
    to: {
      opacity: 1,
    },
  },
  "backdrop_e31823"
);

const backdropHide = keyframes(
  {
    from: {
      opacity: 1,
    },
    to: {
      opacity: 0,
    },
  },
  "backdrop_fa2a0d"
);

const useStyles = makeStyles(
  (theme) => ({
    backdrop: {
      backgroundColor: "rgba(8, 25, 43, 0.2)",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      basedOn: [layout.column, layout.centerCenter],
      animation: `${backdropShow} 0.15s linear backwards`,
    },
    highContrast: {
      backgroundColor: "rgba(255, 255, 255, 0.9)",
    },
    backdropHide: {
      animation: `${backdropHide} 0.15s linear both`,
    },
    hide: {
      animation: `${hideAnim} 0.15s ${styleguide.transition.timing.standard} both`,
    },
  }),
  "backdrop_2fa637"
);

export { useStyles as useBackdropStyles };

export type BackdropProps = React.PropsWithChildren<{
  open: boolean;
  onClickOutside?: any;
  className?: string;
  onClose?: (e: any) => void;
  onOpen?: () => void;
  rootId?: string;
  highContrast?: boolean;
}>;
export function Backdrop({
  open,
  children,
  onClickOutside,
  onOpen,
  className,
  rootId,
  highContrast,
}: BackdropProps) {
  const styles = useStyles();
  // const domState = useScopedObservable(DomState);
  const timeout = useRef<number>();
  const [visible, setVisible] = useState(open);
  const [css, setCss] = useState(null);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }
    if (!open) {
      timeout.current = setTimeout(() => {
        if (!mounted.current) {
          return;
        }
        setVisible(false);
      }, 200);
      setCss(styles.hide);
    } else {
      setCss("");
      setVisible(true);
      onOpenRef.current?.();
    }
  }, [open, styles]);

  const ignoreClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const backgroundClick = useCallback(
    (e) => {
      ignoreClick(e);
      onClickOutside && onClickOutside();
    },
    [ignoreClick, onClickOutside]
  );
  if (!visible) {
    return null;
  }
  const root = rootId && document.getElementById(rootId);

  return createUniversalPortal(
    <Layer priority={3}>
      {({ zIndex }) => (
        <div
          className={cn(
            styles.backdrop,
            css && styles.backdropHide,
            highContrast && styles.highContrast,
            className
          )}
          style={{ zIndex }}
          onClick={backgroundClick}
        >
          {children}{" "}
        </div>
      )}
    </Layer>,
    root
  );
}
