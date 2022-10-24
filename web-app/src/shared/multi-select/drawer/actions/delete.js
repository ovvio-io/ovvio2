import React from 'react';
import cssObjects, { cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import Menu from '@ovvio/styles/lib/components/menu';
import { Text } from '@ovvio/styles/lib/components/texts';
import { useTheme } from '@ovvio/styles/lib/theme';
import { Button, RaisedButton } from '@ovvio/styles/lib/components/buttons';
import { IconDelete } from '@ovvio/styles/lib/components/icons';

const styles = cssObjects(theme => ({
  deletePopup: {
    backgroundColor: theme.background[0],
    width: styleguide.gridbase * 32,
    marginBottom: styleguide.gridbase * 2,
  },
  deletePopupContent: {
    backgroundColor: theme.background[0],
    width: '100%',
    boxSizing: 'border-box',
    padding: styleguide.gridbase * 3,
    textAlign: 'center',
  },
  buttons: {
    marginTop: styleguide.gridbase * 2,
    basedOn: [layout.row, layout.centerCenter],
  },
  button: {
    width: styleguide.gridbase * 12,
    margin: styleguide.gridbase * 0.5,
    height: styleguide.gridbase * 4,
    borderRadius: styleguide.gridbase * 0.5,
    border: 'solid 1px #9cb2cd',
    color: '#9cb2cd',
    textTransform: 'uppercase',
  },
  deleteBtn: {
    color: '#f43434',
    borderColor: '#f43434',
  },
}));

function DeleteActionPopup({ items, close, onDeleted }) {
  const onDelete = e => {
    e.stopPropagation();
    items.forEach(x => (x.snapshot.isDeleted = 1));
    close();
    onDeleted();
  };
  return (
    <div className={cn(styles.deletePopupContent)}>
      <Text>Are you sure you want to delete the selected items?</Text>
      <div className={cn(styles.buttons)}>
        <Button
          className={cn(styles.button, styles.deleteBtn)}
          onClick={onDelete}
        >
          Delete
        </Button>
        <Button className={cn(styles.button)} onClick={close}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function DeleteAction({ items, onDeleted, className }) {
  const theme = useTheme();
  return (
    <Menu
      renderButton={({ isOpen }) => {
        const props = {};
        if (isOpen) {
          props.fill = theme.primary[500];
        }
        return <IconDelete {...props} />;
      }}
      position="top"
      align="center"
      direction="out"
      className={className}
      popupClassName={cn(styles.deletePopup)}
    >
      <DeleteActionPopup items={items} onDeleted={onDeleted} />
    </Menu>
  );
}
