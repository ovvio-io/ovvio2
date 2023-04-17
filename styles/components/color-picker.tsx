import React from 'react';
import { makeStyles, cn } from '../css-objects/index.ts';
import { styleguide } from '../styleguide.ts';
import { layout } from '../layout.ts';
import { IconButton } from './buttons.tsx';

const useStyles = makeStyles(
  (theme) => ({
    picker: {
      justifyContent: 'flex-start',
      basedOn: [layout.row, layout.flex],
    },
    colorButton: {
      width: styleguide.gridbase * 6,
      height: styleguide.gridbase * 6,
      marginRight: styleguide.gridbase,
      boxSizing: 'border-box',
      ':hover': {
        ':not(disabled)': {
          mixBlendMode: 'multiply',
          backgroundColor: '#f0f3fa',
        },
      },
    },
    color: {
      borderRadius: '50%',
      height: styleguide.gridbase * 2.5,
      width: styleguide.gridbase * 2.5,
    },
    big: {
      height: styleguide.gridbase * 3,
      width: styleguide.gridbase * 3,
    },
    xsmall: {
      height: styleguide.gridbase * 1.5,
      width: styleguide.gridbase * 1.5,
    },
    selectedColor: {
      borderWidth: 4,
      borderStyle: 'solid',
      borderColor: 'none',
    },
  }),
  'color-picker_e0a995'
);

export function makeTransparent(color: string): string {
  color = color.split('#').join('');
  const r = parseInt(color[0] + color[1], 16);
  const g = parseInt(color[2] + color[3], 16);
  const b = parseInt(color[4] + color[5], 16);
  return `rgba(${r}, ${g}, ${b}, 0.2)`;
}

export const COLORS = ['#1995d1', '#00c7d6', '#da9f43', '#dd2e9a', '#fe4a62'];

interface ColorCircleProps {
  color: string;
  className?: string;
  size?: 'xsmall' | 'small' | 'big';
}
export function ColorCircle({
  color,
  className,
  size = 'small',
}: ColorCircleProps) {
  const styles = useStyles();
  return (
    <div
      className={cn(styles.color, styles[size], className)}
      style={{ backgroundColor: makeTransparent(color) }}
    />
  );
}

interface ColorButtonProps {
  color: string;
  className?: string;
  size?: 'xsmall' | /*'small' |*/ 'big';
  isSelected: boolean;
  disabled?: boolean;
  onClick?: (e: any) => void;
  onMouseDown?: (e: any) => void;
}
export function ColorButton({
  color,
  className,
  size,
  isSelected,
  disabled,
  ...props
}: ColorButtonProps) {
  const styles = useStyles();
  return (
    <IconButton
      type="button"
      className={cn(
        styles.colorButton,
        isSelected && styles.selectedColor,
        className
      )}
      style={{ borderColor: makeTransparent(color) }}
      disabled={disabled}
      {...props}
    >
      <ColorCircle color={color} size={size} />
    </IconButton>
  );
}

interface ColorPickerProps {
  value: any;
  onChange?: (e: any) => void;
  className?: string;
  style?: any;
  disabled?: boolean;
}
export default function ColorPicker({
  value,
  onChange,
  className,
  style,
  disabled = false,
}: ColorPickerProps) {
  const styles = useStyles();
  return (
    <div className={cn(className, styles.picker)} style={style}>
      {COLORS.map((c) => (
        <ColorButton
          color={c}
          isSelected={value === c}
          onClick={() => {
            if (onChange) {
              onChange(c);
            }
          }}
          key={c}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
