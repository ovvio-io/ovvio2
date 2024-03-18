import React, { useCallback } from 'react';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { Note, Tag } from '../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../cfds/client/suggestions.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import { IconCreateNew } from '../../../../styles/components/icons/index.ts';
import Menu from '../../../../styles/components/menu.tsx';
import { IconPlus } from '../../../../styles/components/new-icons/icon-plus.tsx';
import { IconSize } from '../../../../styles/components/new-icons/types.ts';
import {
  cn,
  keyframes,
  makeStyles,
} from '../../../../styles/css-objects/index.ts';
import { useTheme } from '../../../../styles/theme.tsx';
import { useSharedQuery } from '../../core/cfds/react/query.ts';
import {
  MentionItem,
  MentionPopup,
  MentionPopupRenderItem,
} from '../../shared/card/mention.tsx';
import { VertexId } from '../../../../cfds/client/graph/vertex.ts';
import { useGraphManager } from '../../core/cfds/react/graph.tsx';
import { usePartialVertex } from '../../core/cfds/react/vertex.ts';
import { mapIterable, unionIter } from '../../../../base/common.ts';
import SelectionButton from '../selection-button/index.tsx';
import DropDown, {
  DropDownItem,
} from '../../../../styles/components/inputs/drop-down.tsx';
import { brandLightTheme as theme } from '../../../../styles/theme.tsx';
import { useTypographyStyles } from '../../../../styles/components/typography.tsx';
import TagView, { TagPillView } from './tag-view.tsx';
import TagPicker from '../../../../components/tag-picker.tsx';

const showAnim = keyframes({
  '0%': {
    opacity: 0,
  },
  '99%': {
    opacity: 0,
  },
  '100%': {
    opacity: 1,
  },
});
const useStyles = makeStyles((theme) => ({
  list: {
    // basedOn: [layout.row],
    height: styleguide.gridbase * 3,
    alignItems: 'center',
  },
  standard: {
    flexDirection: 'row-reverse',
    assignee: {
      marginLeft: styleguide.gridbase,
    },
  },
  reverse: {
    flexDirection: 'row',
    assignee: {
      marginRight: styleguide.gridbase,
    },
  },
  assignee: {},
  regular: {
    marginTop: styleguide.gridbase * 2,
    marginBottom: styleguide.gridbase,
    addButton: {
      width: styleguide.gridbase * 3,
      height: styleguide.gridbase * 3,
    },
  },
  small: {
    marginTop: styleguide.gridbase * 3,
    addButton: {
      width: styleguide.gridbase * 2.5,
      height: styleguide.gridbase * 2.5,
    },
  },
  addButton: {
    borderRadius: '50%',
    border: ``,
  },
  popup: {
    backgroundColor: '#FFFFFF',
    // width: styleguide.gridbase * 32,
    // width: '100%',
    marginBottom: styleguide.gridbase * 2,
  },
  popupContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    boxSizing: 'border-box',
    basedOn: [layout.column],
  },
  input: {
    border: 'none',
    width: '100%',
    borderBottom: '1px solid rgba(156, 178, 205, 0.6)',
    borderRadius: 0,
  },
  circleContainer: {
    height: styleguide.gridbase * 4,
    width: styleguide.gridbase * 4,
    basedOn: [layout.column, layout.centerCenter],
    fontSize: '13px',
  },
  circle: {
    height: styleguide.gridbase,
    width: styleguide.gridbase,
    borderRadius: '50%',
  },
  tagName: {
    flexGrow: 1,
    whiteSpace: 'nowrap',
    color: '##262626',
    fontSize: '13px',
  },
  tagColor: {
    height: styleguide.gridbase * 3,
    width: styleguide.gridbase * 3,
    circle: {
      height: styleguide.gridbase,
      width: styleguide.gridbase,
      borderRadius: '50%',
    },
    basedOn: [layout.column, layout.centerCenter],
  },
  // tagName: {
  //   marginLeft: styleguide.gridbase * 0.75,
  //   marginRight: styleguide.gridbase / 2,
  //   color: theme.colors.text,
  //   animation: `${showAnim} ${styleguide.transition.duration.short}ms linear backwards`,
  //   userSelect: 'none',
  //   basedOn: [useTypographyStyles.textSmall],
  // },
  tagDropDownName: {
    marginLeft: styleguide.gridbase * 0.75,
    marginRight: styleguide.gridbase / 2,
    // color: theme.colors.text,
    animation: `${showAnim} ${styleguide.transition.duration.short}ms linear backwards`,
    userSelect: 'none',
    basedOn: [useTypographyStyles.text],
  },
}));

interface TagButtonProps {
  noteId: VertexId<Note>;
  className?: string;
  onTagged: (tagItem: Tag) => void;
  isSmall?: boolean;
}
export default function TagButton({
  noteId,
  className,
  onTagged,
  isSmall = true,
}: TagButtonProps) {
  const styles = useStyles();
  const partialNote = usePartialVertex(noteId, ['tags', 'workspace']);
  const existingTags = new Set(
    unionIter(
      mapIterable(partialNote.tags.keys(), (t) => t.key),
      mapIterable(partialNote.tags.values(), (t) => t.key)
    )
  );
  const childTagsQuery = useSharedQuery('childTags');

  const getItems = () => {
    const childTagManagers = childTagsQuery
      .group(partialNote.workspace.key)
      .filter(
        (mgr) =>
          !existingTags.has(mgr.key) &&
          !existingTags.has(mgr.getVertexProxy().parentTagKey!)
      );

    if (!childTagManagers.length) {
      return [];
    }

    const tags = childTagManagers.map((tagManager) => {
      return tagManager.getVertexProxy();
    });

    return tags;
  };

  return (
    <Menu
      renderButton={() => (
        <IconPlus size={isSmall ? IconSize.Small : IconSize.Medium} />
      )}
      position="bottom"
      align="end"
      direction="out"
      className={className}
      popupClassName={cn(styles.popup)}
    >
      <TagPicker
        tags={getItems()}
        onRowSelect={onTagged}
        closeAfterClick={true}
      />
    </Menu>
  );
}

interface TagShowMoreButtonProps {
  className?: string;
  // onTagged: (tagItem: Tag) => void;
  isSmall?: boolean;
  hiddenTags: Tag[];
}
export function TagShowMoreButton({
  className,
  // onTagged,
  isSmall = true,
  hiddenTags,
}: TagShowMoreButtonProps) {
  const styles = useStyles();

  const renderButton = () => {
    return <TagPillView className={className} showMenu={true} />;
  };
  const onChange = (t: Tag) => {
    return (
      <TagView
        className={className}
        showMenu={true}
        tag={t.manager}
        onSelected={function (tag: Tag): void {
          throw new Error('Function not implemented.');
        }}
      />
    );
  };

  return (
    <DropDown
      value={hiddenTags}
      onChange={onChange}
      renderSelected={renderButton}
    >
      {hiddenTags.map((t) => (
        <DropDownItem value={t} key={t.key}>
          <div className={cn(styles.circleContainer)}>
            <div className={cn(styles.circle)} />#
          </div>
          <span className={cn(styles.tagDropDownName)}>{t.name}</span>
        </DropDownItem>
      ))}
    </DropDown>
  );
}
