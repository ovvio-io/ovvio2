import React, { MouseEvent, useCallback, useRef, useState } from 'react';
import { makeStyles, cn } from '../../css-objects/index.ts';
import { styleguide } from '../../styleguide.ts';
import { layout } from '../../layout.ts';
import Popper, { PopperAlign, PopperPosition } from '../popper.tsx';

const useStyles = makeStyles(
  (theme) => ({
    container: {
      position: 'relative',
    },
    tooltip: {
      fontSize: 10,
      color: theme.background[0],
      position: 'relative',
      zIndex: 100,
      lineHeight: 1.6,
      padding: '0px 8px',
      whiteSpace: 'nowrap',
      backgroundColor: theme.background[700],
      margin: styleguide.gridbase,
      borderRadius: 3,
      height: styleguide.gridbase * 3,
      boxSizing: 'border-box',
      basedOn: [layout.column, layout.centerCenter],
    },
    open: {},
  }),
  'tooltip_d751da'
);

export interface TooltipProps {
  text: string;
  children: React.ReactElement;
  locked?: boolean;
  className?: string;
  position?: PopperPosition;
  align?: PopperAlign;
  disabled?: boolean;
}

export const Tooltip = ({
  text,
  children,
  locked,
  className,
  position = 'top',
  align = 'center',
  disabled = false,
}: TooltipProps) => {
  const styles = useStyles();
  const buttonRef = useRef();
  const [isOpen, setIsOpen] = useState(!!locked);
  const button: React.ReactElement = React.Children.only(children);
  const childProps = {
    ref: buttonRef,
    ...button.props,
  };

  const { onMouseOver, onMouseLeave } = childProps;

  const onTooltipMouseOver = useCallback(
    (e: MouseEvent) => {
      setIsOpen(!disabled && (locked || true));
      if (onMouseOver) {
        onMouseOver(e);
      }
    },
    [locked, onMouseOver, disabled]
  );

  const onTooltipMouseLeave = useCallback(
    (e: MouseEvent) => {
      setIsOpen(!disabled && (locked || false));
      if (onMouseLeave) {
        onMouseLeave(e);
      }
    },
    [locked, onMouseLeave, disabled]
  );
  childProps.onMouseOver = onTooltipMouseOver;
  childProps.onMouseLeave = onTooltipMouseLeave;

  const cloned = React.cloneElement(button, childProps);
  return (
    <React.Fragment>
      {cloned}
      <Popper
        open={isOpen && !!text}
        anchor={buttonRef.current!}
        position={position}
        align={align}
      >
        <div className={cn(styles.tooltip, className)}>{text}</div>
      </Popper>
    </React.Fragment>
  );
};

export default Tooltip;
