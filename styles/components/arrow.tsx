import React from 'react';
import { makeStyles } from '../css-objects/index.ts';
import { brandLightTheme as theme1 } from '../theme.tsx';
import { cn } from '../css-objects/index.ts';

interface ArrowProps {
  position: 'left' | 'right' | 'bottom' | 'top';
  shadowPosition: 'leftShadow' | 'rightShadow' | 'bottomShadow' | 'topShadow';
  containerPosition:
    | 'leftArrowContainer'
    | 'bottomArrowContainer'
    | 'rightArrowContainer'
    | 'topArrowContainer';
  oneCellMenu?: boolean;
}

const useStyles = makeStyles(() => ({
  arrow: {
    position: 'absolute',
    borderWidth: '2.4px',
    borderStyle: 'solid',
    backgroundColor: 'white',
    transform: 'rotate(45deg)',
    width: '8px',
    height: '8px',
  },

  bottomArrowContainer: {
    overflow: 'visible',
    position: 'absolute',
    top: '-6px',
    right: '20px',
  },

  topArrowContainer: {
    overflow: 'visible',
    position: 'absolute',
    bottom: '6px',
    right: '20px',
  },

  leftArrowContainer: {
    overflow: 'visible',
    position: 'absolute',
    right: '6px',
    top: '7px',
  },

  rightArrowContainer: {
    position: 'absolute',
    overflow: 'visible',
    top: '7px',
    left: '-6px',
  },

  right: {
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderLeftColor: theme1.secondary.s2,
    borderBottomColor: theme1.secondary.s2,
  },

  left: {
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: theme1.secondary.s2,
    borderTopColor: theme1.secondary.s2,
  },

  bottom: {
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: theme1.secondary.s2,
    borderTopColor: theme1.secondary.s2,
  },

  top: {
    borderLeftColor: 'transparent',
    borderTopColor: 'transparent',
    borderRightColor: theme1.secondary.s2,
    borderBottomColor: theme1.secondary.s2,
  },

  arrowShadow: {
    width: '11px',
    height: '11px',
    transform: 'rotate(45deg)',
    top: '1px',
    zIndex: -6,
  },

  bottomShadow: {
    position: 'absolute',
    width: '11px',
    height: '11px',
    boxShadow: '0px 0px 3px 1px rgba(0, 0, 0, 0.25)',
  },

  topShadow: {
    position: 'absolute',
    width: '11px',
    height: '11px',
    boxShadow: '0px 0px 3px 1px rgba(0, 0, 0, 0.25)',
  },

  leftShadow: {
    position: 'absolute',
    right: '-11px',
    width: '11px',
    height: '13px',
    boxShadow: '0px 0px 3px 1px rgba(0, 0, 0, 0.25)',
  },

  rightShadow: {
    position: 'absolute',
    left: '0.5px',
    width: '13px',
    height: '12px',
    boxShadow: '0px 0px 3px 1px rgba(0, 0, 0, 0.25)',
  },

  oneCellMenu: {
    top: '3px',
  },
}));

const Arrow: React.FC<ArrowProps> = ({
  position,
  shadowPosition,
  oneCellMenu,
  containerPosition,
}) => {
  const styles = useStyles();

  return (
    <div className={styles[containerPosition]}>
      <div
        className={cn(
          styles.arrow,
          styles[position],
          oneCellMenu && styles.oneCellMenu
        )}
      />
      <div
        className={cn(
          styles[shadowPosition],
          styles.arrowShadow,
          oneCellMenu && styles.oneCellMenu
        )}
      />
    </div>
  );
};

export default Arrow;
