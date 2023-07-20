import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { User } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles/lib';
import Tooltip from '@ovvio/styles/lib/components/tooltip';
import { useTypographyStyles } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { usePartialVertex } from 'core/cfds/react/vertex';
import React from 'react';
const useStyles = makeStyles(() => ({
  container: {
    overflow: 'hidden',
    borderRadius: styleguide.gridbase * 2,
    minWidth: styleguide.gridbase * 4,
    height: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    basedOn: [layout.column, layout.centerCenter],
  },
  noAvatar: {
    border: '1px solid',
    borderColor: theme.mono.m2,
    backgroundColor: theme.colors.background,
  },
  small: {
    boxSizing: 'border-box',
    padding: [0, 2],
    borderRadius: styleguide.gridbase,
    minWidth: styleguide.gridbase * 2,
    height: styleguide.gridbase * 2,
  },
  withImage: {
    '&small': {
      padding: 0,
      width: styleguide.gridbase * 2,
    },
    '&big': {
      width: styleguide.gridbase * 4,
    },
  },
  userInitials: {
    textTransform: 'uppercase',
    basedOn: [useTypographyStyles.textSmall],
  },
  big: {
    userInitials: {
      fontSize: 15,
    },
  },
}));

interface AvatarProps {
  user: VertexManager<User>;
  size?: 'small' | 'big';
  className?: string;
  style?: {};
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(x => x[0])
    .filter(x => x)
    .join('');
}

function AvatarView({
  user,
  size = 'small',
  className,
  style = {},
}: AvatarProps) {
  const styles = useStyles();
  const { name, avatarUrl } = usePartialVertex(user, [
    'name',
    'avatarUrl',
    'isNull',
    'isLoading',
  ]);

  if (!user || user.isNull || user.isLoading) {
    return null;
  }

  return (
    <Tooltip text={name}>
      <div
        className={cn(
          className,
          styles.container,
          styles[size],
          avatarUrl ? styles.withImage : styles.noAvatar
        )}
        style={{
          ...style,
        }}
      >
        {avatarUrl ? (
          <img width="100%" height="100%" src={avatarUrl} alt={name} />
        ) : (
          <span className={cn(styles.userInitials)}>{getInitials(name)}</span>
        )}
      </div>
    </Tooltip>
  );
}

export default AvatarView;
