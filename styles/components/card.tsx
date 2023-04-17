import React from 'react';
import { makeStyles, cn } from '../css-objects/index.ts';
import { styleguide } from '../styleguide.ts';

const useStyles = makeStyles(
  (theme) => ({
    card: {
      boxSizing: 'border-box',
      backgroundColor: theme.background[0],
      padding: styleguide.gridbase * 4,
      boxShadow: theme.shadows.z1,
    },
  }),
  'card_f93538'
);

type DivProps = React.ComponentPropsWithoutRef<'div'>;

const Card: React.FC<DivProps & { className?: string }> = ({
  children,
  className,
  ...rest
}) => {
  const styles = useStyles();
  return (
    <div className={cn(className, styles.card)} {...rest}>
      {children}
    </div>
  );
};

export default Card;
