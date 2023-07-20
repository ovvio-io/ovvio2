import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Tag, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { suggestResults } from '@ovvio/cfds/lib/client/suggestions';
import { Dictionary } from '@ovvio/cfds/lib/collections/dict';
import { layout, styleguide } from '@ovvio/styles/lib';
import { IconCreateNew } from '@ovvio/styles/lib/components/icons';
import Menu from '@ovvio/styles/lib/components/menu';
import { IconPlus } from '@ovvio/styles/lib/components/new-icons/icon-plus';
import { IconSize } from '@ovvio/styles/lib/components/new-icons/types';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useTheme } from '@ovvio/styles/lib/theme';
import { isTag, useQuery } from 'core/cfds/react/query';
import { useEffect, useRef } from 'react';
import {
  MentionItem,
  MentionPopup,
} from 'shared/multi-select/drawer/actions/mention';
import { CreateTagContext, useCreateTag } from './create-tag-context';
import { getFullTagName } from './tag-utils';

const useStyles = makeStyles(theme => ({
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
  workspaceManager: VertexManager<Workspace>;
  cardTagsMng: Dictionary<VertexManager<Tag>, VertexManager<Tag>>;
  onTagged: (tagItem: Tag) => void;
}
function AssignActionPopup({
  close,
  onTagged,
  workspaceManager,
  cardTagsMng,
}: AssignActionPopupProps) {
  const styles = useStyles();
  const theme = useTheme();
  const createTag = useCreateTag();

  const createTagRef = useRef<CreateTagContext>(createTag);
  useEffect(() => {
    createTagRef.current = createTag;
  }, [createTag]);

  const { results: childTags } = useQuery<Tag>(
    x =>
      isTag(x) &&
      !!x.name &&
      x.workspaceKey === workspaceManager?.key &&
      !!x.parentTag &&
      !!x.parentTag.name,
    [workspaceManager?.key],
    {
      name: 'AssignActionPopup',
      source: workspaceManager.getVertexProxy<Workspace>().tagsQuery,
    }
  );

  const getItems = (filter: string) => {
    if (!childTags) {
      return [];
    }
    const candidates: {
      tag: Tag;
      key: string;
      title: string;
    }[] = [];

    childTags
      .map(x => x.getVertexProxy())
      .forEach(child => {
        if (cardTagsMng.has(child.parentTag.manager as VertexManager<Tag>)) {
          return;
        }
        candidates.push({
          tag: child,
          key: child.key,
          title: getFullTagName(child),
        });
      });

    const filteredRes = suggestResults(filter, candidates, c => c.title);

    // const filteredRes = res
    //   .filter(t => !filter || t.dist > filter.length * 0.1)
    //   .sort((a, b) => {
    //     if (!filter || filter.trim() === '') {
    //       return sortTags(a.tag, b.tag);
    //     }

    //     return b.dist - a.dist;
    //   });

    filteredRes.push({
      key: TAG_NOT_FOUND,
      title: null,
      tag: null,
    });

    return filteredRes;
  };
  const onSelected = (item: any, filter: string) => {
    if (item.key === TAG_NOT_FOUND) {
      if (filter) {
        if (filter.startsWith('#')) {
          filter = filter.slice(1);
        }
      }

      createTagRef.current.requestCreateTag({
        workspaceManager,
        initialName: filter,
        logSource: 'card-header',
        onTagCreated: tag => {
          onTagged(tag);
        },
      });
    } else {
      onTagged(item.tag);
    }
  };
  const renderItem = (item, props) => {
    if (item.key === TAG_NOT_FOUND) {
      return (
        <MentionItem {...props} key={item.key}>
          <span className={cn(styles.tagColor)}>
            <IconCreateNew fill={theme.primary[500]} />
          </span>
          <span className={cn(styles.tagName)}>Create tag</span>
        </MentionItem>
      );
    }

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
        <span className={cn(styles.tagName)}>{getFullTagName(item.tag)}</span>
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
  workspaceManager: VertexManager<Workspace>;
  cardTagsMng: Dictionary<VertexManager<Tag>, VertexManager<Tag>>;
  className?: string;
  onTagged: (tagItem: Tag) => void;
  isSmall?: boolean;
}
export default function TagButton({
  workspaceManager,
  cardTagsMng,
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
      <AssignActionPopup
        workspaceManager={workspaceManager}
        cardTagsMng={cardTagsMng}
        onTagged={onTagged}
      />
    </Menu>
  );
}
