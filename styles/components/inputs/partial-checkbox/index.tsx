import React from 'react';
import { makeStyles, cn } from '../../../css-objects/index.ts';
import { styleguide } from '../../../styleguide.ts';
import { layout } from '../../../layout.ts';
import Layer from '../../layer.tsx';
import { CHECKBOX_STATES } from './states.tsx';
import CheckboxIcon from './checkbox-icon.tsx';

export { CHECKBOX_STATES };

const useStyles = makeStyles(
  (theme) => ({
    container: {
      position: 'relative',
      display: 'inline-block',
      width: styleguide.gridbase * 3,
      height: styleguide.gridbase * 3,
      padding: 3,
      backgroundColor: 'transparent',
      boxSizing: 'border-box',
      cursor: 'pointer',
      basedOn: [layout.column, layout.centerCenter],
    },
    borderContainer: {
      width: styleguide.gridbase * 2.25,
      height: styleguide.gridbase * 2.25,
      borderWidth: 2,
      borderStyle: 'solid',
      borderRadius: 3,
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
      basedOn: [layout.column, layout.centerCenter],
    },
    background: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      height: '150%',
      width: '150%',
      borderRadius: '50%',
      transform: 'translate(-50%, -50%) scale(0)',
      ...styleguide.transition.standard,
      transitionProperty: 'transform',
    },
    toggled: {
      transform: 'translate(-50%, -50%) scale(1)',
    },
    input: {
      appearance: 'none',
      display: 'block',
      opacity: 0,
    },
  }),
  'partial-checkbox_dbb76a'
);

interface CheckboxProps {
  state: CHECKBOX_STATES;
  onChange: (state: CHECKBOX_STATES) => void;
  className: string;
  name?: string;
  disabled?: boolean;
  color?: string;
  symbolColor?: string;
}

function PartialCheckBox({
  state,
  onChange,
  name,
  disabled,
  className,
  color = '#D7E3F1',
  symbolColor = 'white',
  ...rest
}: CheckboxProps) {
  const styles = useStyles();
  const ref: any = React.createRef();
  const onClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled) {
      return;
    }
    ref.current && ref.current.click();
    return true;
  };

  const onCheckboxChanged = (e) => {
    e.preventDefault();
    e.stopPropagation();
    switch (state) {
      case CHECKBOX_STATES.ALL: {
        onChange(CHECKBOX_STATES.NONE);
        break;
      }
      case CHECKBOX_STATES.NONE:
      case CHECKBOX_STATES.SOME:
      default: {
        onChange(CHECKBOX_STATES.ALL);
        break;
      }
    }
  };

  return (
    <label
      className={cn(className, styles.container)}
      onClick={onClick}
      {...rest}
    >
      <div
        className={cn(styles.borderContainer)}
        style={{
          borderColor: color,
        }}
      >
        <div
          style={{
            backgroundColor: color,
          }}
          className={cn(
            styles.background,
            state !== CHECKBOX_STATES.NONE && styles.toggled
          )}
        />
        <Layer>
          {({ zIndex }) => (
            <CheckboxIcon
              style={{ zIndex }}
              fill={symbolColor}
              selectionState={state}
            />
          )}
        </Layer>
      </div>
      <input
        className={cn(styles.input)}
        type="checkbox"
        name={name}
        checked={state === CHECKBOX_STATES.ALL}
        onChange={onCheckboxChanged}
        disabled={disabled}
        {...rest}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      />
    </label>
  );
}

export default PartialCheckBox;
