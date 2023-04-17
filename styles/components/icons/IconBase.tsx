import React from 'react';
import { makeStyles, cn } from '../../css-objects/index.ts';

import { styleguide } from '../../styleguide.ts';
import { layout } from '../../layout.ts';

const useStyles = makeStyles(
  {
    icon: {
      basedOn: [layout.column, layout.centerCenter],
      pointerEvents: 'none',
    },
    small: {
      width: styleguide.gridbase * 2,
      height: styleguide.gridbase * 2,
    },
    big: {
      width: styleguide.gridbase * 3,
      height: styleguide.gridbase * 3,
    },
    bigger: {
      width: styleguide.gridbase * 4,
      height: styleguide.gridbase * 4,
    },
  },
  'IconBase_f63d61'
);

interface IconBaseProps {
  children: any;
  size: 'small' | 'big';
  className?: string;
  style?: any;
}

const IconBase = React.forwardRef<HTMLDivElement, IconBaseProps>(function (
  { children, size, className = '', style = {} }: IconBaseProps,
  ref
) {
  const styles = useStyles();
  return (
    <div
      className={cn(className, styles.icon, styles[size] || styles.small)}
      style={style}
      ref={ref}
    >
      {children}
    </div>
  );
});
export interface IconProps {
  fill?: string;
  className?: string;
}
export default IconBase;
