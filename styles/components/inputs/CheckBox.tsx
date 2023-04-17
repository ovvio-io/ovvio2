import { layout } from '../../layout.ts';
import React, { MouseEventHandler, useRef } from 'react';
import { cn, makeStyles } from '../../css-objects/index.ts';
import { styleguide } from '../../styleguide.ts';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconCheck } from '../new-icons/icon-check.tsx';
const BORDER_WIDTH = 2;
const useStyles = makeStyles(
  () => ({
    container: {
      position: 'relative',
      display: 'inline-block',
      width: styleguide.gridbase * 2,
      height: styleguide.gridbase * 2,
      border: `${BORDER_WIDTH}px solid ${theme.mono.m4}`,
      borderRadius: 2,
      backgroundColor: 'transparent',
      boxSizing: 'border-box',
      cursor: 'pointer',
      flexShrink: 0,
    },

    input: {
      appearance: 'none',
      display: 'block',
      opacity: 0,
    },
    checkmark: {
      position: 'absolute',
      overflow: 'hidden',
      top: -BORDER_WIDTH,
      left: -BORDER_WIDTH,
      bottom: -BORDER_WIDTH,
      width: 0,
      ...styleguide.transition.short,
      transitionProperty: 'width',
      basedOn: [layout.column, layout.centerCenter],
    },
    iconCheck: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
    },
    checked: {
      checkmark: {
        width: '100%',
      },
      // borderColor: theme.colors.primaryButton,
    },
  }),
  'CheckBox_f22211'
);

type CheckboxInputProps = React.ComponentPropsWithoutRef<'input'>;

function Checkmark({ isChecked }: { isChecked: boolean }) {
  const styles = useStyles();

  return (
    <div className={cn(styles.checkmark)}>
      <IconCheck className={cn(styles.iconCheck)} />
    </div>
  );
}

export interface CheckBoxProps extends CheckboxInputProps {
  checked: boolean;
  className?: string;
  color?: string;
}

export function CheckBox({
  checked,
  onChange,
  name,
  disabled = false,
  className = '',
  ...rest
}: CheckBoxProps) {
  const styles = useStyles();
  const ref = useRef<HTMLInputElement>();
  const onClick: MouseEventHandler<HTMLLabelElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled) {
      return;
    }
    ref.current?.click();
  };
  const labelProps: Record<string, any> = {};
  if (typeof rest.contentEditable !== 'undefined') {
    labelProps.contentEditable = rest.contentEditable;
  }

  return (
    <label
      className={cn(className, styles.container, checked && styles.checked)}
      onClick={onClick}
      {...labelProps}
    >
      <Checkmark isChecked={checked} />
      <input
        className={cn(styles.input)}
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      />
    </label>
  );
}

export default CheckBox;
