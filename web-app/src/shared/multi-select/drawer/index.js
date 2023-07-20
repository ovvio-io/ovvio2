import React, { useContext } from 'react';
import ReactDOM from 'react-dom';
import cssObjects, { cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import { toastContext } from '@ovvio/styles/lib/components/toast';
import RadioBox from '@ovvio/styles/lib/components/inputs/radio';
import { TOGGLE_SELECT_ALL } from '../reducer';
import { useMultiSelectContext } from '../context';
import { Text } from '@ovvio/styles/lib/components/texts';
import { DeleteAction, AssignAction } from './actions';

const styles = cssObjects(theme => ({
  drawerPlaceholder: { height: styleguide.gridbase * 8 },
  drawerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: styleguide.gridbase * 9,
    pointerEvents: 'none',
  },
  drawer: {
    backgroundColor: theme.background[0],
    transform: 'translateY(100%)',
    height: '100%',
    ...styleguide.transition.standard,
    transitionProperty: 'transform',
    boxSizing: 'border-box',
    padding: styleguide.gridbase * 3,
    alignItems: 'center',
    basedOn: [layout.row],
    ':before': {
      content: '""',
      boxShadow: '0 -2px 26px 0 #dce0e6',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      opacity: 0,
      ...styleguide.transition.standard,
      transitionProperty: 'opacity',
    },
  },
  visible: {
    pointerEvents: 'all',
    drawer: {
      transform: 'translateY(0)',
      ':before': {
        opacity: 1,
      },
    },
  },
  toggleSelected: {
    flexShrink: 0,
    width: styleguide.gridbase * 14,
    basedOn: [layout.row, layout.centerCenter],
  },
  radio: {
    marginRight: styleguide.gridbase,
  },
  selectAll: {
    color: '#6c8cb3',
    basedOn: [layout.flex],
  },
  actions: {
    basedOn: [layout.row, layout.flexSpacer, layout.centerCenter],
  },
  action: {
    margin: [0, styleguide.gridbase],
  },
}));

function MultiSelectDrawerPopup({ onDeleted, reload }) {
  const toastController = useContext(toastContext);
  const { state, dispatch } = useMultiSelectContext();
  const toggleSelected = () => {
    dispatch({ type: TOGGLE_SELECT_ALL });
  };
  const onTagged = tag => {
    toastController.displayToast({
      text: `Selected items are tagged as ${tag.snapshot.name}`,
      duration: 5000,
    });
  };
  const onAssigned = assignee => {
    toastController.displayToast({
      text: `${assignee.name} was assigned to the selected tasks`,
      duration: 5000,
    });
  };
  const filtered = state.allItems.filter(x => state.items[x.key]);

  return ReactDOM.createPortal(
    <div
      className={cn(
        styles.drawerContainer,
        state.inSelection && styles.visible
      )}
    >
      <div className={cn(styles.drawer)}>
        <div className={cn(styles.toggleSelected)} onClick={toggleSelected}>
          <RadioBox
            className={cn(styles.radio)}
            toggled={state.allSelected}
            onToggle={toggleSelected}
          />
          <Text className={cn(styles.selectAll)}>
            {state.allSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </div>
        <div className={cn(styles.actions)}>
          <AssignAction
            items={filtered}
            onAssigned={onAssigned}
            className={cn(styles.action)}
          />
          <DeleteAction
            items={filtered}
            onDeleted={onDeleted}
            className={cn(styles.action)}
          />
        </div>
      </div>
    </div>,
    window.document.getElementById('root')
  );
}

export default function MultiSelectDrawer(props) {
  return (
    <div className={cn(styles.drawerPlaceholder)}>
      <MultiSelectDrawerPopup {...props} />
    </div>
  );
}
