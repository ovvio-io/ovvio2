import React from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import { MentionItem } from 'shared/multi-select/drawer/actions/mention';
import { getFullTagName } from 'shared/tags/tag-utils';
import { Tag } from '@ovvio/cfds/lib/client/graph/vertices';

const useStyles = makeStyles(theme => ({
  circleContainer: {
    height: styleguide.gridbase * 4,
    width: styleguide.gridbase * 4,
    basedOn: [layout.column, layout.centerCenter],
  },
  circle: {
    height: styleguide.gridbase,
    width: styleguide.gridbase,
    borderRadius: '50%',
  },
  tagName: {
    flexGrow: 1,
    whiteSpace: 'nowrap',
    marginLeft: styleguide.gridbase,
    color: theme.background.text,
  },
}));

interface TagMentionItemProps {
  item: Tag;
}
export default function TagMentionItem({
  item,
  ...props
}: TagMentionItemProps) {
  const styles = useStyles();
  return (
    <MentionItem {...props} key={item.key}>
      <div className={cn(styles.circleContainer)}>
        <div
          className={cn(styles.circle)}
          style={{
            backgroundColor: item.color,
          }}
        />
      </div>
      <span className={cn(styles.tagName)}>{getFullTagName(item)}</span>
    </MentionItem>
  );
}
