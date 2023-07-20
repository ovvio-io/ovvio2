import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  FormEvent,
} from 'react';
import { makeStyles, cn } from '../../../../../styles/css-objects/index.ts';
import { styleguide, layout } from '../../../../../styles/index.ts';
import { CoreObject } from '../../../../../base/core-types/base.ts';
import { NS_TAGS } from '../../../../../cfds/base/scheme-types.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { Tag } from '../../../../../cfds/client/graph/vertices/tag.ts';
import { Workspace } from '../../../../../cfds/client/graph/vertices/workspace.ts';
import ColorPicker, {
  ColorCircle,
} from '../../../../../styles/components/color-picker.tsx';
import Dialog, {
  DialogHeader,
  DialogActions,
  DialogButton,
  DialogContent,
} from '../../../../../styles/components/dialog/index.tsx';
import IconDropDownArrow from '../../../../../styles/components/icons/IconDropDownArrow.tsx';
import TextField from '../../../../../styles/components/inputs/TextField.tsx';
import DropDown, {
  DropDownItem,
} from '../../../../../styles/components/inputs/drop-down.tsx';
import { H3, Text } from '../../../../../styles/components/texts.tsx';
import { useGraphManager } from '../../../core/cfds/react/graph.tsx';
import { usePartialVertex } from '../../../core/cfds/react/vertex.ts';
import { CreateTagRequest } from '../create-tag-context.tsx';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import { useLogger } from '../../../core/cfds/react/logger.tsx';

const useStyles = makeStyles((theme) => ({
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
  const parentTagsByWorkspace = useSharedQuery('parentTagsByWorkspace');

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
      {parentTagsByWorkspace.group(workspaceManager).map((pTag) => (
        <DropDownItem key={pTag.key} value={pTag}>
          <ParentTagOrNull tagMng={pTag} />
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
  const styles = useStyles();
  const logger = useLogger();
  const [name, setName] = useState<string | undefined>(request.initialName);
  const [color, setColor] = useState(null);
  const [created, setCreated] = useState(false);
  const ref = useRef<any>();
  const [parentMng, setParentMng] = useState<undefined | VertexManager<Tag>>(
    undefined
  );
  const parent = usePartialVertex(parentMng, ['color']);
  const graph = useGraphManager();

  useEffect(() => {
    setName(request.initialName || '');
    logger.log({
      severity: 'INFO',
      event: 'Start',
      flow: 'create',
      source: request.logSource,
      type: 'tag',
    });
  }, [request, logger]);

  useLayoutEffect(() => {
    setColor(null);
    setName(undefined);
    setCreated(false);
    setParentMng(undefined);
    if (ref.current) {
      ref.current.focus();
      setTimeout(() => {
        if (ref.current) {
          ref.current.focus();
        }
      }, 0);
    }
  }, []);

  const isDisabled = (!color && !parent) || !name;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let tagParent: string | undefined;

    if (parent) {
      tagParent = parent.key;
    }

    const keys = (name || '').split(',');
    const newTags: Tag[] = [];

    keys.forEach((k) => {
      const name = k.trim();

      const initialData: CoreObject = {
        workspace: request.workspaceManager.key,
        name: name,
        createdBy: graph.rootKey,
      };
      if (tagParent) {
        initialData['parentTag'] = tagParent;
      }

      const newTag = graph.createVertex<Tag>(NS_TAGS, initialData);
      logger.log({
        severity: 'INFO',
        event: 'End',
        flow: 'create',
        type: 'tag',
        source: request.logSource,
        vertex: newTag.key,
      });
      newTags.push(newTag);
    });

    setCreated(true);
    if (request.onTagCreated !== undefined) {
      setTimeout(() => {
        newTags.forEach((newTag) => {
          request.onTagCreated!(newTag);
        });
      }, 0);
    }

    setTimeout(() => {
      onClose!();
    }, 1500);
  };

  return (
    <form
      onClick={(e) => e.stopPropagation()}
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
              onChange={(e) => setName(e.currentTarget.value)}
              ref={ref}
            />
          </div>
          <div className={cn(styles.inputGroup)}>
            <H3 className={cn(styles.label)}>Nest Tag Under</H3>
            <ParentDropDown
              workspaceManager={request.workspaceManager}
              parentMng={parentMng!}
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
  const logger = useLogger();

  const onCloseImp = (created: boolean) => {
    if (!created) {
      logger.log({
        severity: 'INFO',
        event: 'Cancel',
        flow: 'create',
        type: 'tag',
        source: request.logSource,
      });
    }
    onClose!();
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
