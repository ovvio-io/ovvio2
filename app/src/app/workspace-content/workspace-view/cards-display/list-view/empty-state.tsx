import React from 'react';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../styles/layout.ts';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import EmptyIllustration from './empty-illustration.tsx';

const useStyles = makeStyles((theme) => ({
  image: {
    display: 'flex',
    marginTop: '30px',
  },
  text: {
    display: 'inline-block',
    textAlign: 'center',
  },
  header1: {
    fontSize: '24px',
    color: '#273142',
    marginTop: '8%',
    fontWeight: 'normal',
  },
  header2: {
    fontSize: '18px',
    marginTop: '15px',
    color: 'rgba(17, 8, 43, 0.8)',
  },
}));

export function EmptyListState() {
  const styles = useStyles();
  return (
    <div className={cn(layout.column, layout.flex)}>
      <Text className={cn(styles.header1, styles.text)}>
        Time to Start Moving
      </Text>
      <Text className={cn(styles.header2, styles.text)}>
        Create notes, invite team members and get some work done
      </Text>
      <div className={cn(layout.centerCenter, styles.image)}>
        <EmptyIllustration />
      </div>
    </div>
  );
}
