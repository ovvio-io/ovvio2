import React from 'react';
import IconBase, { IconProps } from './IconBase.tsx';
import { makeStyles, cn } from '../../css-objects/index.ts';

import { styleguide } from '../../styleguide.ts';
import { useTheme } from '../../theme.tsx';

const useMenuStyles = makeStyles(
  {
    path: {
      ...styleguide.transition.standard,
      transitionProperty: 'd',
    },
  },
  'IconMenu_e6eeaa'
);

export interface IconMenuProps extends IconProps {
  isExpanded?: boolean;
}

export const IconMenu = ({
  fill,
  className,
  isExpanded = false,
}: IconMenuProps) => {
  const styles = useMenuStyles();
  const theme = useTheme();
  if (!fill) {
    fill = theme.background.text;
  }
  const pathCommands = isExpanded
    ? [
        'M 4.8,6.649',
        'H 18,4.8',
        'z',
        'M 0,12',
        'h 18',
        'H 0',
        'z',
        'M 0 1',
        'h 18',
        'H 0',
        'z',
      ]
    : [
        'M 0,6.649',
        'H 13.2,4.8',
        'z',
        'M 0,12',
        'h 18',
        'H 0',
        'z',
        'M 0 1',
        'h 18',
        'H 0',
        'z',
      ];
  return (
    <IconBase size="big" className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="13"
        viewBox="0 0 18 13"
      >
        <path
          className={cn(styles.path)}
          fill="none"
          fillRule="evenodd"
          stroke={fill}
          strokeWidth="2"
          d={pathCommands.join(' ')}
        />
      </svg>
    </IconBase>
  );
};

export default IconMenu;
