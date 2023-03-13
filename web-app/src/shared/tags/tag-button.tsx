import React from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { Note, Tag } from '../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../cfds/client/suggestions.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import { IconCreateNew } from '../../../../styles/components/icons/index.ts';
import Menu from '../../../../styles/components/menu.tsx';
import { IconPlus } from '../../../../styles/components/new-icons/icon-plus.tsx';
import { IconSize } from '../../../../styles/components/new-icons/types.ts';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
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
import { unionIter } from '../../../../base/common.ts';

const useStyles = makeStyles((theme) => ({
  list: {
    basedOn: [layout.row],
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
    backgroundColor: theme.background[0],
    width: styleguide.gridbase * 32,
    marginBottom: styleguide.gridbase * 2,
  },
  popupContent: {
    backgroundColor: theme.background[0],
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
}));

const TAG_NOT_FOUND = 'tag-not-found';

interface AssignActionPopupProps {
  close?: any;
  noteId: VertexId<Note>;
  onTagged: (tagItem: Tag) => void;
}
function AddTagActionPopup({
  close,
  onTagged,
  noteId,
}: AssignActionPopupProps) {
  const styles = useStyles();
  const theme = useTheme();
  const graph = useGraphManager();
  const partialNote = usePartialVertex(noteId, ['tags']);
  const existingTags = new Set(
    unionIter(partialNote.tags.keys(), partialNote.tags.values())
  );

  // const createTagRef = useRef<CreateTagContext>(createTag);
  // useEffect(() => {
  //   createTagRef.current = createTag;
  // }, [createTag]);
  const childTagsQuery = useSharedQuery('childTags');

  // const { results: childTags } = useQuery<Tag>(
  //   (x) => isTag(x) && !!x.name && !!x.parentTag && !!x.parentTag.name,
  //   [workspaceManager?.key],
  //   {
  //     name: 'AssignActionPopup',
  //     source: workspaceManager.graph.sharedQueriesManager.tagsQuery,
  //   }
  // );

  const getItems = (filter: string) => {
    if (!childTagsQuery.count) {
      return [];
    }
    // const candidates: {
    //   tag: Tag;
    //   key: string;
    //   title: string;
    // }[] = [];

    // childTags
    //   .map((x) => x.getVertexProxy())
    //   .forEach((child) => {
    //     if (cardTagsMng.has(child.parentTag?.manager as VertexManager<Tag>)) {
    //       return;
    //     }
    //     candidates.push({
    //       tag: child,
    //       key: child.key,
    //       title: child.fullName,
    //     });
    //   });

    const filteredRes: (VertexManager<Tag> | string)[] = suggestResults(
      filter,
      childTagsQuery.results,
      (tag) => tag.getVertexProxy().fullName
    );

    // const filteredRes = res
    //   .filter(t => !filter || t.dist > filter.length * 0.1)
    //   .sort((a, b) => {
    //     if (!filter || filter.trim() === '') {
    //       return sortTags(a.tag, b.tag);
    //     }

    //     return b.dist - a.dist;
    //   });

    if (filteredRes.length === 0) {
      filteredRes.push(TAG_NOT_FOUND);
    }

    return filteredRes;
  };
  const onSelected = (item: VertexManager<Tag> | string, filter: string) => {
    if (item === TAG_NOT_FOUND) {
      if (filter) {
        if (filter.startsWith('#')) {
          filter = filter.slice(1);
        }
      }

      // createTagRef.current.requestCreateTag({
      //   workspaceManager,
      //   initialName: filter,
      //   logSource: 'card-header',
      //   onTagCreated: (tag) => {
      //     onTagged(tag);
      //   },
      // });
    } else {
      onTagged((item as VertexManager<Tag>).getVertexProxy());
    }
  };
  const renderItem: MentionPopupRenderItem<VertexManager<Tag> | string> = (
    item,
    props
  ) => {
    if (item === TAG_NOT_FOUND) {
      return (
        <MentionItem {...props} key={item}>
          <span className={cn(styles.tagColor)}>
            <IconCreateNew fill={theme.primary[500]} />
          </span>
          <span className={cn(styles.tagName)}>Create tag</span>
        </MentionItem>
      );
    }

    return (
      <MentionItem {...props} key={(item as VertexManager).key}>
        <div className={cn(styles.circleContainer)}>
          <div
            className={cn(styles.circle)}
            // style={{
            //   backgroundColor: item.color,
            // }}
          />
        </div>
        <span className={cn(styles.tagName)}>
          {(item as VertexManager<Tag>).getVertexProxy().fullName}
        </span>
      </MentionItem>
    );
  };

  return (
    <MentionPopup
      getItems={getItems}
      trigger="#"
      onSelected={onSelected}
      renderItem={renderItem}
    />
  );
}

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

  return (
    <Menu
      renderButton={() => (
        <IconPlus size={isSmall ? IconSize.Small : IconSize.Medium} />
      )}
      position="top"
      align="center"
      direction="in"
      className={className}
      popupClassName={cn(styles.popup)}
    >
      <AddTagActionPopup noteId={noteId} onTagged={onTagged} />
    </Menu>
  );
}
