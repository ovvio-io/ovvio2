import React, { useState, useEffect, useRef } from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import { Text } from '@ovvio/styles/lib/components/texts';
import { ChangeRecord, useChangeRecord } from '../change-store';
import { Scroller } from 'core/react-utils/scrolling';
import Layer from '@ovvio/styles/lib/components/layer';
import {
  makeTransparent,
  COLORS,
  ColorButton,
} from '@ovvio/styles/lib/components/color-picker';
import { Tag, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { useBaseQueryProvider } from 'core/cfds/react/query';
import {
  TagGroup,
  TagsTreeQueryProvider,
  TagTree,
} from 'shared/tags/tags.query';
import { EventCategory, EventLogger, useEventLogger } from 'core/analytics';
import { Button } from '@ovvio/styles/lib/components/buttons';
import { Utils } from '@ovvio/base';
import { useScopedObservable } from 'core/state';
import UserStore from 'stores/user';
import { IconAdd } from '@ovvio/styles/lib/components/icons';
import { useGraphManager } from 'core/cfds/react/graph';
import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import { SchemeNamespace } from '@ovvio/cfds/lib/base/scheme-types';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { WSActionNames } from '../../../../core/analytics/types';
import { tagSortValueBase } from 'shared/tags/tag-utils';

const useStyles = makeStyles(theme => ({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflowX: 'hidden',
  },
  settings: {
    width: '100%',
    height: '100%',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  row: {
    height: styleguide.gridbase * 8.5,
    boxSizing: 'border-box',
    alignItems: 'center',
    paddingLeft: styleguide.gridbase * 8,
    borderBottom: '1px solid #d2d6dc',
    basedOn: [layout.row],
  },
  pillSize: {
    height: styleguide.gridbase * 4,
    padding: styleguide.gridbase,
    borderRadius: styleguide.gridbase * 2,
    minWidth: styleguide.gridbase * 6,
    boxSizing: 'border-box',
    justifyContent: 'space-between',
    alignItems: 'center',
    basedOn: [layout.row],
  },
  pillRoot: {
    position: 'relative',
  },
  invisible: {
    visibility: 'hidden',
  },
  tagPill: {
    color: 'var(--tag-color)',
    borderStyle: 'solid',
    borderWidth: 0,
    marginRight: styleguide.gridbase * 2,
    borderColor: 'var(--tag-color)',
    backgroundColor: 'var(--tag-bg-color)',
  },
  tagChildPill: {
    backgroundColor: theme.background[0],
    borderWidth: 1,
    marginRight: styleguide.gridbase,
  },
  deleteIcon: {
    width: styleguide.gridbase * 2,
    height: styleguide.gridbase * 2,
    marginLeft: styleguide.gridbase,
    cursor: 'pointer',
  },
  input: {
    fontSize: 14,
    lineHeight: '20px',
    outline: 'none',
    border: 'none',
    padding: 0,
    color: '#787387',
  },
  pillInput: {
    position: 'absolute',
    left: styleguide.gridbase,
    top: '50%',
    transform: 'translateY(-50%)',
    '::selection': {
      backgroundColor: 'var(--tag-bg-color)',
    },
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: styleguide.gridbase * 10,
    boxSizing: 'border-box',
    padding: [styleguide.gridbase * 4, 0],
    backgroundColor: theme.background[0],
    boxShadow: '-3px 0 4px 0 rgb(247, 249, 254)',
    transform: 'translateX(0)',
    ...styleguide.transition.standard,
    transitionProperty: 'transform',
    alignItems: 'center',
    justifyContent: 'space-between',
    basedOn: [layout.column],
  },
  drawerHidden: {
    transform: 'translateX(100%)',
  },
  colorButton: {
    marginRight: 0,
    width: styleguide.gridbase * 4,
    height: styleguide.gridbase * 4,
  },
  addParentButton: {
    width: '91px',
    height: '32px',
    borderRadius: '16px',
    backgroundColor: '#d7e3f1',
    marginTop: '17px',
    marginLeft: '62px',
  },
  addParenButtonText: {
    fontFamily: 'Roboto',
    fontSize: '14px',
    fontWeight: 'normal',
    fontStretch: 'normal',
    fontStyle: 'normal',
    lineHeight: 'normal',
    letterSpacing: 'normal',
    color: '#9cb2cd',
  },
  addSubTagOval: { width: '32px', height: '32px', border: 'solid 2px #da9f43' },
}));

interface DeleteIconProps {
  fill?: string;
  className?: string;
  onClick?: (e: any) => void;
}
const DeleteIcon = function ({ fill, className, onClick }: DeleteIconProps) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width="16"
      height="16"
      viewBox="0 0 10 10"
      onClick={onClick}
    >
      <defs>
        <path
          id="P94XKLlgfuGoRojWLDCv"
          d="M7.5 6.794l-.706.706L5 5.706 3.206 7.5 2.5 6.794 4.294 5 2.5 3.206l.706-.706L5 4.294 6.794 2.5l.706.706L5.706 5 7.5 6.794zM5 0C2.237 0 0 2.237 0 5s2.237 5 5 5 5-2.237 5-5-2.237-5-5-5z"
        />
      </defs>
      <use
        fill={fill}
        fillRule="evenodd"
        style={{ mixBlendMode: 'multiply' }}
        xlinkHref="#P94XKLlgfuGoRojWLDCv"
      />
    </svg>
  );
};

interface TagInputProps {
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  onBlur: () => void;
  className?: string;
}
const TagInput = React.forwardRef(function (
  { name, setName, onBlur, className }: TagInputProps,
  ref: any
) {
  const styles = useStyles();
  const [value, setValue] = useState(name);
  useEffect(() => {
    setValue(name);
  }, [name]);
  const onChange = e => {
    setValue(e.target.value);
  };
  const commit = () => {
    setName(value);
    onBlur();
  };
  const reset = () => {
    setValue(name);
    onBlur();
  };
  const blur = e => {
    commit();
  };

  const onKeyDown = e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      reset();
    } else if (e.key === 'Enter') {
      e.stopPropagation();
      e.preventDefault();
      commit();
    }
  };

  return (
    <input
      className={cn(styles.input, className)}
      type="text"
      ref={ref}
      value={value}
      onChange={onChange}
      onBlur={blur}
      onKeyDown={onKeyDown}
    />
  );
});

interface ITagPillInfo {
  readonly key: string;
  readonly name: string;
  readonly isNew: boolean;
  onCommit: (cRec: ChangeRecord) => void;
}

interface IParentTagPillInfo extends ITagPillInfo {
  readonly graphMng: GraphManager;
  readonly color: string;
  readonly children: ITagPillInfo[];
  readonly workspace: Workspace;
  readonly isDeleted: boolean;

  onParentCommit: (cRec: ChangeRecord) => void;
}

interface TagPillProps {
  tag: ITagPillInfo;
  isChild: boolean;
  color: string;
  onDelete?: (tag: ITagPillInfo) => void;
  setRowEditing: any;
  logAction: (action: WSActionNames) => void;
}
function TagPill({
  tag,
  isChild,
  color,
  onDelete,
  setRowEditing,
  logAction,
}: TagPillProps) {
  const styles = useStyles();
  const [isEditing, setIsEditing] = useState(false);

  const record = useChangeRecord(tag.key, r => {
    tag.onCommit(r);
  });

  const inputRef = useRef<any>();
  const currentName = record.get('name') || tag.name;

  const onClick = () => {
    logAction('TAG_SETTINGS_TAG_FOCUSED');
    setIsEditing(true);
    setRowEditing(true);
    inputRef.current.focus();

    if (inputRef.current.setSelectionRange) {
      inputRef.current.setSelectionRange(0, currentName.length);
    }
    window.requestAnimationFrame(() => {
      inputRef.current.focus();
    });
  };
  const removeTag = e => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(tag);
    }
    record.set('isDeleted', 1);

    if (!isChild) {
      logAction('TAG_SETTINGS_PARENT_TAG_REMOVED');
    } else {
      logAction('TAG_SETTINGS_CHILD_TAG_REMOVED');
    }
  };
  const onBlur = () => {
    if (isEditing === true) {
      logAction('TAG_SETTINGS_TAG_UNFOCUSED');
    }
    setIsEditing(false);
    setRowEditing(false);
  };
  if (record.get('isDeleted')) {
    return null;
  }

  return (
    <div className={cn(styles.pillRoot)}>
      <div
        className={cn(
          styles.pillSize,
          styles.tagPill,
          isChild && styles.tagChildPill,
          isEditing && styles.invisible
        )}
        onClick={onClick}
      >
        <Text>{currentName}</Text>
        <div className={cn(styles.deleteIcon)} onClick={removeTag}>
          <DeleteIcon fill={color} />
        </div>
      </div>
      <TagInput
        name={currentName}
        setName={x => record.set('name', x)}
        className={cn(styles.pillInput, !isEditing && styles.invisible)}
        onBlur={onBlur}
        ref={inputRef}
      />
    </div>
  );
}

interface AddSubTagButtonProps {
  onClicked: () => void;
  color: string;
}
function AddSubTagButton({ onClicked, color }: AddSubTagButtonProps) {
  return (
    <Button onClick={onClicked}>
      <IconAdd size={12} fill={color} />
    </Button>
  );
}

interface ColorDrawerProps {
  color: string;
  setColor: React.Dispatch<React.SetStateAction<string>>;
  className?: string;
}
function ColorDrawer({ color, setColor, className }: ColorDrawerProps) {
  const styles = useStyles();
  const onColorClick = (e, c) => {
    e.preventDefault();
    e.stopPropagation();
    if (c !== color) {
      setColor(c);
    }
  };

  //TODO: Amit: Key missing Error
  return (
    <Layer>
      {({ zIndex }) => (
        <div style={{ zIndex }} className={cn(styles.drawer, className)}>
          <Text>Color</Text>
          {COLORS.map(c => (
            <ColorButton
              key={c}
              color={c}
              size="xsmall"
              isSelected={color === c}
              onMouseDown={e => onColorClick(e, c)}
              className={cn(styles.colorButton)}
            />
          ))}
        </div>
      )}
    </Layer>
  );
}

interface ParentTagRowProps {
  tag: IParentTagPillInfo;
  logAction: (action: string) => void;
}

function ParentTagRow({ tag, logAction }: ParentTagRowProps) {
  const styles = useStyles();
  const [rowEditing, setRowEditing] = useState(false);
  const eventLogger = useEventLogger();
  const currentUser = useScopedObservable(UserStore);

  const [children, setChildren] = useState<ITagPillInfo[]>(tag.children);
  const ref = useRef<any>();

  const changeRecord = useChangeRecord(`${tag.key}-row`, r => {
    tag.onParentCommit(r);
  });

  const color = changeRecord.get('color') || tag.color;
  useEffect(() => {
    if (ref.current) {
      ref.current.style.setProperty('--tag-color', color);
      ref.current.style.setProperty('--tag-bg-color', makeTransparent(color));
    }
  }, [color]);

  const onColorChanged = c => {
    changeRecord.set('color', c);
    logAction('TAG_SETTINGS_COLOR_CHANGED');
  };

  if (changeRecord.get('isDeleted')) {
    return null;
  }

  const onAddSubTag = () => {
    const newChildren = [...children];
    newChildren.push(new NewSubTagPillInfo(tag, currentUser.id, eventLogger));
    setChildren(newChildren);
    logAction('TAG_SETTINGS_CREATE_CHILD_TAG');
  };

  return (
    <div className={cn(styles.row)} ref={ref}>
      <TagPill
        key={tag.key}
        tag={tag}
        color={color}
        isChild={false}
        onDelete={() => changeRecord.set('isDeleted', true)}
        setRowEditing={setRowEditing}
        logAction={logAction}
      />
      {children.map(x => (
        <TagPill
          key={x.key}
          tag={x}
          color={color}
          isChild={true}
          setRowEditing={setRowEditing}
          logAction={logAction}
        />
      ))}
      <AddSubTagButton onClicked={onAddSubTag} color={color} />

      <ColorDrawer
        className={cn(!rowEditing && styles.drawerHidden)}
        color={color}
        setColor={onColorChanged}
      />
    </div>
  );
}

function TagPillSort(a: IParentTagPillInfo, b: IParentTagPillInfo) {
  return (
    tagSortValueBase(a.name, false, a.children.length > 0) -
    tagSortValueBase(b.name, false, b.children.length > 0)
  );
}

export interface TagsSettingsProps {
  workspaceManager: VertexManager<Workspace>;
  className?: string;
  style?: any;
}

export default function TagsSettings({
  workspaceManager,
  className,
  style,
}: TagsSettingsProps) {
  const styles = useStyles();
  const tagTree = useBaseQueryProvider(
    TagsTreeQueryProvider,
    {
      workspaceKey: workspaceManager.key,
    },
    TagTree.empty()
  ).result;

  const eventLogger = useEventLogger();
  const graphMng = useGraphManager();
  const currentUser = useScopedObservable(UserStore);

  const [tags, setTags] = useState<IParentTagPillInfo[]>([]);

  useEffect(() => {
    setTags(
      tagTree.parents.map(
        x => new ExistParentTagPillInfo(graphMng, x, eventLogger)
      )
    );
  }, [graphMng, tagTree, eventLogger]);

  const logAction = (action: WSActionNames) => {
    eventLogger.wsAction(action, workspaceManager, {
      category: EventCategory.WS_SETTINGS,
    });
  };

  const onCreateParentTag = () => {
    const newTags = [
      new NewParentTagPillInfo(
        graphMng,
        workspaceManager,
        currentUser.id,
        eventLogger
      ),
      ...tags,
    ];
    setTags(newTags);
    eventLogger.wsAction('TAG_SETTINGS_CREATE_PARENT_TAG', workspaceManager, {
      category: EventCategory.WS_SETTINGS,
    });
  };

  return (
    <div style={style} className={cn(styles.root, className)}>
      <Scroller>
        {ref => (
          <div className={cn(styles.settings)} ref={ref}>
            {tags.sort(TagPillSort).map(tag => (
              <ParentTagRow key={tag.key} tag={tag} logAction={logAction} />
            ))}
            <Button
              className={cn(styles.addParentButton)}
              onClick={onCreateParentTag}
            >
              <span className={cn(styles.addParenButtonText)}>+ add tag</span>
            </Button>
          </div>
        )}
      </Scroller>
    </div>
  );
}

class ExistTagPillInfo implements ITagPillInfo {
  private _tag: Tag;
  protected _eventLogger: EventLogger;

  constructor(tag: Tag, eventLogger: EventLogger) {
    this._tag = tag;
    this._eventLogger = eventLogger;
  }

  get key() {
    return this._tag.key;
  }

  get name() {
    return this._tag.name;
  }

  get isNew() {
    return false;
  }

  onCommit(r: ChangeRecord) {
    const changedName = r.get('name');

    if (changedName) {
      this._tag.name = changedName;

      this._eventLogger.wsAction('TAG_UPDATED', this._tag.workspace, {
        category: EventCategory.WS_SETTINGS,
        tagId: this._tag.key,
        parentTagId: this._tag.parentTag?.key,
      });
    }
    if (r.get('isDeleted')) {
      this._tag.isDeleted = 1;

      this._eventLogger.wsAction('TAG_DELETED', this._tag.workspace, {
        category: EventCategory.WS_SETTINGS,
        tagId: this._tag.key,
        parentTagId: this._tag.parentTag?.key,
      });
    }
  }

  onDelete() {}
}

class ExistParentTagPillInfo
  extends ExistTagPillInfo
  implements IParentTagPillInfo
{
  private _graphMng: GraphManager;
  private _group: TagGroup;
  private _children: ITagPillInfo[];

  constructor(
    graphMng: GraphManager,
    tagGroup: TagGroup,
    eventLogger: EventLogger
  ) {
    super(tagGroup.parentTag, eventLogger);
    this._graphMng = graphMng;
    this._group = tagGroup;
    this._children = tagGroup.children.map(
      x => new ExistTagPillInfo(x, eventLogger)
    );
  }

  get isDeleted() {
    return this._group.parentTag.isDeleted !== 0;
  }

  get workspace() {
    return this._group.parentTag.workspace;
  }

  get graphMng() {
    return this._graphMng;
  }

  get key() {
    return this._group.parentTag.key;
  }

  get name() {
    return this._group.parentTag.name;
  }

  get parentTag() {
    return this._group.parentTag;
  }

  get isNew() {
    return false;
  }

  get color() {
    return this._group.parentTag.color;
  }

  get children() {
    return this._children;
  }

  onParentCommit(cRec: ChangeRecord) {
    const color = cRec.get('color');
    if (color) {
      this._group.parentTag.color = color;

      this._eventLogger.wsAction(
        'TAG_UPDATED',
        this._group.parentTag.workspace,
        {
          category: EventCategory.WS_SETTINGS,
          tagId: this._group.parentTag.key,
        }
      );
    }
    if (cRec.get('isDeleted')) {
      this._group.parentTag.isDeleted = 1;

      this._group.children.forEach(c => {
        c.isDeleted = 1;

        this._eventLogger.wsAction('TAG_DELETED', c.workspace, {
          category: EventCategory.WS_SETTINGS,
          tagId: c.key,
          parentTagId: this._group.parentTag.key,
        });
      });
    }
  }
}

class NewParentTagPillInfo implements IParentTagPillInfo {
  private _key: string;
  private _eventLogger: EventLogger;
  private _children: NewSubTagPillInfo[];
  private _graphMng: GraphManager;
  private _workspaceManager: VertexManager<Workspace>;
  private _createdBy: string;
  private _color: string;
  private _isDeleted: boolean;

  constructor(
    graphMng: GraphManager,
    workspaceManager: VertexManager<Workspace>,
    createdBy: string,
    eventLogger: EventLogger
  ) {
    this._key = 'parent-key' + Utils.uniqueId();
    this._graphMng = graphMng;
    this._workspaceManager = workspaceManager;
    this._createdBy = createdBy;
    this._eventLogger = eventLogger;
    this._children = [];
    this._color = COLORS[0];
    this._isDeleted = false;
  }

  get isDeleted() {
    return this._isDeleted;
  }

  get workspace() {
    return this._workspaceManager.getVertexProxy();
  }

  get graphMng() {
    return this._graphMng;
  }

  get key() {
    return this._key;
  }

  get name() {
    return '';
  }

  get isNew() {
    return true;
  }

  get color() {
    return this._color;
  }

  get children() {
    return this._children;
  }

  onParentCommit(cRec: ChangeRecord) {
    this._color = cRec.get('color');
  }

  onCommit(cRec: ChangeRecord) {
    const isDeleted = cRec.get('isDeleted');
    if (isDeleted !== undefined && (isDeleted === true || isDeleted === 1)) {
      this._isDeleted = true;
      return;
    }

    const newTag = this._graphMng.createVertex<Tag>(SchemeNamespace.TAGS, {
      workspace: this._workspaceManager.key,
      color: this._color,
      name: cRec.get('name'),
      createdBy: this._createdBy,
    });

    this._key = newTag.key;

    this._eventLogger.wsAction('TAG_CREATED', this._workspaceManager, {
      tagId: newTag.key,
      parentTagId: newTag.parentTag?.key,
    });
  }
}

class NewSubTagPillInfo implements ITagPillInfo {
  private _key: string;
  private _parent: IParentTagPillInfo;
  private _graphMng: GraphManager;
  private _createdBy: string;
  private _eventLogger: EventLogger;

  constructor(
    parent: IParentTagPillInfo,
    createdBy: string,
    eventLogger: EventLogger
  ) {
    this._key = 'new-' + Utils.uniqueId();
    this._parent = parent;
    this._graphMng = parent.graphMng;
    this._createdBy = createdBy;
    this._eventLogger = eventLogger;
  }

  get key() {
    return this._key;
  }

  get name() {
    return '';
  }

  get isNew() {
    return true;
  }

  onCommit(changeRec: ChangeRecord) {
    if (this._parent.isDeleted) return;

    const isDeleted = changeRec.get('isDeleted');
    if (isDeleted !== undefined && (isDeleted === true || isDeleted === 1)) {
      return;
    }

    const newTag = this._graphMng.createVertex<Tag>(SchemeNamespace.TAGS, {
      workspace: this._parent.workspace.key,
      color: this._parent.color,
      name: changeRec.get('name'),
      createdBy: this._createdBy,
      parentTag: this._parent.key,
    });

    this._eventLogger.wsAction('TAG_CREATED', newTag.workspace, {
      tagId: newTag.key,
      parentTagId: newTag.parentTag?.key,
    });
  }
}
