import React, { useEffect, useRef, useState } from 'react';
import { useScrollParent } from '../../../../../core/react-utils/scrolling.tsx';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import SpinnerView from '../../../../../../../styles/components/spinner-view.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';

const useStyles = makeStyles((theme) => ({
  loaderContainer: {
    basedOn: [layout.row, layout.centerCenter],
  },
}));

interface InfiniteScrollProps {
  recordsLength: number;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  isVisible: boolean;
}
const THRESHOLD = 300;

export function InfiniteScroll({
  recordsLength,
  limit,
  setLimit,
  pageSize,
  isVisible,
}: InfiniteScrollProps) {
  const styles = useStyles();
  const scrollParent = useScrollParent();
  const parentEl = scrollParent;
  const previousLimit = useRef(limit);
  const canLoadMore = recordsLength >= limit;
  const [didMount, setDidMount] = useState(false);
  useEffect(() => {
    if (limit < previousLimit.current) {
      if (parentEl) {
        parentEl.scrollTop = 0;
      }
    }
    previousLimit.current = limit;
  }, [limit, parentEl]);
  useEffect(() => {
    if (parentEl && canLoadMore) {
      const handler = () => {
        const diff =
          parentEl.scrollHeight - (parentEl.scrollTop + parentEl.clientHeight);
        if (diff < THRESHOLD) {
          setLimit((x) => x + pageSize);
        }
      };
      parentEl.addEventListener('scroll', handler);

      return () => {
        parentEl.removeEventListener('scroll', handler);
      };
    }
  }, [parentEl, canLoadMore, pageSize, didMount, setLimit]);
  useEffect(() => {
    let canMount = true;
    window.setTimeout(() => {
      if (canMount) {
        setDidMount(true);
      }
    }, 0);
    return () => {
      canMount = false;
    };
  }, []);

  if (canLoadMore && isVisible) {
    return (
      <div className={cn(styles.loaderContainer)}>
        <SpinnerView size={styleguide.gridbase * 3} />
      </div>
    );
  }
  return null;
}
