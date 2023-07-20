import React, { useState, useCallback, useMemo } from 'react';
import cssObjects, { cn } from '@ovvio/styles/lib/css-objects';
import { styleguide } from '@ovvio/styles/lib';
import RadioBox from '@ovvio/styles/lib/components/inputs/radio';
import { useMultiSelectContext } from './context';
import { TOGGLE_SELECTED } from './reducer';

const styles = cssObjects(theme => ({
  radioContainer: {
    position: 'absolute',
    right: '100%',
    top: styleguide.gridbase * 2,
    paddingRight: styleguide.gridbase * 2,
    paddingTop: styleguide.gridbase * 0.5,
    paddingBottom: styleguide.gridbase * 0.5,
    opacity: 0,
    transition: `${styleguide.transition.duration.short}ms linear opacity`,
  },
  radioContainerVisible: {
    opacity: 1,
  },
}));

function RadioBoxItem({ item, isHover }) {
  const { dispatch, state } = useMultiSelectContext();
  const isSelected = state.items[item.key];
  const inSelection = state.inSelection;

  const setSelected = () => {
    dispatch({
      type: TOGGLE_SELECTED,
      payload: { item },
    });
  };

  const onToggle = e => {
    e.stopPropagation();
    e.preventDefault();
    setSelected();
  };

  return (
    <div
      className={cn(
        styles.radioContainer,
        (inSelection || isHover) && styles.radioContainerVisible
      )}
      onClick={onToggle}
    >
      <RadioBox toggled={isSelected} onToggle={setSelected} />
    </div>
  );
}

export default function MultiSelectItem({ item, children, disabled }) {
  const [isHover, setIsHover] = useState(false);
  const { dispatch, state } = useMultiSelectContext();
  const isSelected = state.items[item.key];

  const inSelection = state.inSelection;
  const renderCheckbox = useCallback(
    () => <RadioBoxItem item={item} isHover={isHover} />,
    [item, isHover]
  );
  const attributes = useMemo(
    () => ({
      onMouseEnter() {
        setIsHover(!disabled);
      },
      onMouseLeave() {
        setIsHover(false);
      },
      onClick(e) {
        if (inSelection) {
          e.preventDefault();
          e.stopPropagation();
          dispatch({
            type: TOGGLE_SELECTED,
            payload: { item },
          });
          return true;
        }
      },
    }),
    [inSelection, dispatch, item, disabled]
  );
  return children(attributes, renderCheckbox, isSelected);
}
