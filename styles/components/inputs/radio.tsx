import React from 'react';
import { makeStyles, cn } from '../../css-objects/index.ts';
import { styleguide } from '../../styleguide.ts';
import { layout } from '../../layout.ts';

const useStyles = makeStyles(
  (theme) => ({
    circle: {
      width: styleguide.gridbase * 2,
      height: styleguide.gridbase * 2,
      backgroundColor: theme.background[0],
      borderRadius: '50%',
      border: `1px solid #d7e3f1`,
      boxSizing: 'border-box',
      basedOn: [layout.column, layout.centerCenter],
    },
    radioIndicator: {
      width: styleguide.gridbase,
      height: styleguide.gridbase,
      backgroundColor: theme.primary[500],
      borderRadius: '50%',
      transform: 'scale(0)',
      ...styleguide.transition.standard,
      transitionProperty: 'transform',
    },
    radioActive: {
      transform: 'scale(1)',
    },
  }),
  'radio_f9262d'
);

export default function RadioBox({ toggled, onToggle, className }) {
  const onClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onToggle();
  };
  const styles = useStyles();
  return (
    <div className={cn(styles.circle, className)} onClick={onClick}>
      <div
        className={cn(styles.radioIndicator, toggled && styles.radioActive)}
      />
    </div>
  );
}
