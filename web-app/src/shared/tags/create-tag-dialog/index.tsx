import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogActions,
  DialogButton,
} from '@ovvio/styles/lib/components/dialog';
import { TextField } from '@ovvio/styles/lib/components/inputs';
import { H3, Text } from '@ovvio/styles/lib/components/texts';
import ColorPicker, {
  ColorCircle,
} from '@ovvio/styles/lib/components/color-picker';
import CreateTagIllustration from './illustration';
import { useEventLogger } from 'core/analytics';
import DropDown, {
  DropDownItem,
} from '@ovvio/styles/lib/components/inputs/drop-down';
import { IconDropDownArrow } from '@ovvio/styles/lib/components/icons';
import { Tag, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { useBaseQueryProvider } from 'core/cfds/react/query';
import { TagsTreeQueryProvider, TagTree } from '../tags.query';
import { NS_TAGS } from '@ovvio/cfds';
import { useScopedObservable } from 'core/state';
import UserStore from 'stores/user';
import { CreateTagRequest } from '../create-tag-context';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { useGraphManager } from 'core/cfds/react/graph';
import { CoreObject } from '@ovvio/cfds/lib/core-types';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';

const useStyles = makeStyles(theme => ({
  form: {
    width: '100%',
    alignItems: 'stretch',
    margin: 'auto',
    basedOn: [layout.column],
  },
  inputGroup: {
    marginTop: styleguide.gridbase * 5,
    width: '100%',
    alignItems: 'stretch',
    basedOn: [layout.column],
  },
  label: {
    fontWeight: 'normal',
    lineHeight: '1.42',
    color: '#273142',
    marginBottom: styleguide.gridbase,
  },
  parents: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  parentsPopup: {
    maxHeight: styleguide.gridbase * 24,
    boxShadow: '0 3px 10px 0 rgba(42, 62, 82, 0.2)',
    overflowY: 'auto',
  },
  actions: {
    marginTop: styleguide.gridbase * 7,
    justifyContent: 'center',
  },
  illustration: {
    margin: [styleguide.gridbase * 6, 0],
    alignSelf: 'center',
  },
  parentItem: {
    height: styleguide.gridbase * 6,
    padding: styleguide.gridbase,
    boxSizing: 'border-box',
    alignItems: 'center',
    basedOn: [layout.row],
  },
  colorContainer: {
    height: styleguide.gridbase * 3,
    width: styleguide.gridbase * 3,
    marginRight: styleguide.gridbase,
    basedOn: [layout.column, layout.centerCenter],
  },
  selected: {
    height: styleguide.gridbase * 5,
  },
  dropDown: {
    border: `solid 1px rgba(156, 178, 205, 0.6)`,
    borderRadius: 4,
    alignItems: 'center',
    width: '100%',
    basedOn: [layout.row],
  },
  selectedArrow: {
    marginRight: styleguide.gridbase * 2.5,
  },
  emptyText: {
    paddingLeft: styleguide.gridbase,
  },
}));

interface ParentTagOrNullProps {
  tagMng: VertexManager<Tag> | null;
  className?: string;
}
function ParentTagOrNull({ tagMng, className }: ParentTagOrNullProps) {
  const styles = useStyles();
  let content;
  if (tagMng === null) {
    content = <Text className={cn(styles.emptyText)}>--</Text>;
  } else {
    content = <ParentTag tagMng={tagMng} className={className} />;
  }
  return <div className={cn(styles.parentItem, className)}>{content}</div>;
}

interface ParentTagProps {
  tagMng: VertexManager<Tag>;
  className?: string;
}
function ParentTag({ tagMng, className }: ParentTagProps) {
  const styles = useStyles();
  const tag = usePartialVertex(tagMng, ['color', 'name']);
  return (
    <React.Fragment>
      <div className={cn(styles.colorContainer)}>
        <ColorCircle color={tag.color} />
      </div>
      <Text>{tag.name}</Text>
    </React.Fragment>
  );
}

interface ParentDropDownProps {
  workspaceManager: VertexManager<Workspace>;
  parentMng: VertexManager<Tag>;
  setParentMng: React.Dispatch<React.SetStateAction<VertexManager<Tag>>>;
}
function ParentDropDown({
  workspaceManager,
  parentMng,
  setParentMng,
}: ParentDropDownProps) {
  const styles = useStyles();
  const tagTree = useBaseQueryProvider(
    TagsTreeQueryProvider,
    {
      workspaceKey: workspaceManager.key,
    },
    TagTree.empty()
  ).result;

  const renderParent = () => {
    return (
      <div className={cn(styles.dropDown)}>
        <ParentTagOrNull tagMng={parentMng} className={cn(styles.selected)} />
        <div className={cn(layout.flexSpacer)} />
        <IconDropDownArrow className={cn(styles.selectedArrow)} />
      </div>
    );
  };

  return (
    <DropDown
      value={parentMng}
      onChange={setParentMng}
      renderSelected={renderParent}
      position="top"
      direction="in"
      align="start"
      className={styles.parents}
      popupClassName={styles.parentsPopup}
      sizeByButton={true}
    >
      <DropDownItem value={null}>
        <ParentTagOrNull tagMng={null} />
      </DropDownItem>
      {tagTree.parents.map(pTag => (
        <DropDownItem key={pTag.parentTag.key} value={pTag.parentTagMng}>
          <ParentTagOrNull tagMng={pTag.parentTagMng} />
        </DropDownItem>
      ))}
    </DropDown>
  );
}

interface TagFormProps {
  request: CreateTagRequest;
  onClose?: () => void;
}
function TagForm({ request, onClose }: TagFormProps) {
  //const workspace = useVertex(request.workspaceManager);
  const styles = useStyles();
  const eventLogger = useEventLogger();
  const [name, setName] = useState(request.initialName);
  const [color, setColor] = useState(null);
  const [created, setCreated] = useState(false);
  const ref = useRef<any>();
  const [parentMng, setParentMng] = useState<VertexManager<Tag>>(null);
  const parent = usePartialVertex(parentMng, ['color']);

  const graph = useGraphManager();
  const currentUser = useScopedObservable(UserStore);

  useEffect(() => {
    setName(request.initialName);

    eventLogger.action('TAG_CREATE_STARTED', {
      source: request.logSource,
      workspaceId: request.workspaceManager.key,
    });
  }, [request, eventLogger]);

  useLayoutEffect(() => {
    setColor(null);
    setName(null);
    setCreated(false);
    setParentMng(null);
    if (ref.current) {
      ref.current.focus();
      window.setTimeout(() => {
        if (ref.current) {
          ref.current.focus();
        }
      }, 0);
    }
  }, []);

  const isDisabled = (!color && !parent) || !name;

  const onSubmit = e => {
    e.preventDefault();
    e.stopPropagation();

    let tagParent: string | undefined;
    let tagColor: string;

    if (parent) {
      tagParent = parent.key;
      tagColor = parent.color;
    } else {
      tagColor = color;
    }

    const keys = name.split(',');
    const newTags: Tag[] = [];

    keys.forEach(k => {
      const name = k.trim();

      const initialData: CoreObject = {
        workspace: request.workspaceManager.key,
        color: tagColor,
        name: name,
        createdBy: currentUser.id,
      };
      if (tagParent) {
        initialData['parentTag'] = tagParent;
      }

      const newTag = graph.createVertex<Tag>(NS_TAGS, initialData);

      eventLogger.action('TAG_CREATE_COMPLETED', {
        workspaceId: newTag.workspace.key,
        tagId: newTag.key,
        parentTagId: newTag.parentTagKey,
      });

      newTags.push(newTag);
    });

    setCreated(true);
    if (request.onTagCreated !== undefined) {
      window.setTimeout(() => {
        newTags.forEach(newTag => {
          request.onTagCreated(newTag);
        });
      }, 0);
    }

    window.setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <form
      onClick={e => e.stopPropagation()}
      onSubmit={onSubmit}
      className={cn(styles.form)}
    >
      {created ? (
        <React.Fragment>
          <DialogHeader>Success - Tag Created!</DialogHeader>
          <CreateTagIllustration className={cn(styles.illustration)} />
        </React.Fragment>
      ) : (
        <React.Fragment>
          <DialogHeader>Create Tag</DialogHeader>
          <div className={cn(styles.inputGroup)}>
            <H3 className={cn(styles.label)}>Name your new tag</H3>
            <TextField
              value={name}
              onChange={e => setName(e.currentTarget.value)}
              ref={ref}
            />
          </div>
          <div className={cn(styles.inputGroup)}>
            <H3 className={cn(styles.label)}>Nest Tag Under</H3>
            <ParentDropDown
              workspaceManager={request.workspaceManager}
              parentMng={parentMng}
              setParentMng={setParentMng}
            />
          </div>
          {!parent && (
            <div className={cn(styles.inputGroup)}>
              <H3 className={cn(styles.label)}>Choose a color</H3>
              <ColorPicker
                value={color}
                onChange={setColor}
                disabled={!!parent}
              />
            </div>
          )}
          <DialogActions className={cn(styles.actions)}>
            <DialogButton disabled={isDisabled}>CREATE</DialogButton>
          </DialogActions>
        </React.Fragment>
      )}
    </form>
  );
}

interface CreateTagDialogProps {
  request: CreateTagRequest;
  open: boolean;
  onClose?: () => void;
}

export default function CreateTagDialog({
  request,
  open,
  onClose,
}: CreateTagDialogProps) {
  const eventLogger = useEventLogger();

  const onCloseImp = (created: boolean) => {
    if (!created) {
      eventLogger.action('TAG_CREATE_CANCELED', {
        source: request.logSource,
        workspaceId: request.workspaceManager.key,
      });
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClickOutside={() => onCloseImp(false)}
      onClose={() => onCloseImp(false)}
    >
      <DialogContent>
        <TagForm request={request} onClose={() => onCloseImp(true)} />
      </DialogContent>
    </Dialog>
  );
}
