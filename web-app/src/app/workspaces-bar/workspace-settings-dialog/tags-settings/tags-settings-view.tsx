import React, {
  useState,
  useEffect,
  useRef,
  MouseEvent,
  ChangeEvent,
  KeyboardEvent,
  FocusEvent,
} from 'https://esm.sh/react@18.2.0';
import { makeStyles, cn } from '../../../../../../styles/css-objects/index.ts';
import { styleguide, layout } from '../../../../../../styles/index.ts';
import { Text } from '../../../../../../styles/components/texts.tsx';
import { Scroller } from '../../../../core/react-utils/scrolling.tsx';
import Layer from '../../../../../../styles/components/layer.tsx';
import {
  makeTransparent,
  COLORS,
  ColorButton,
} from '../../../../../../styles/components/color-picker.tsx';
import {
  Tag,
  Workspace,
} from '../../../../../../cfds/client/graph/vertices/index.ts';
import { Button } from '../../../../../../styles/components/buttons.tsx';
import { IconAdd } from '../../../../../../styles/components/icons/index.ts';
import {
  useGraphManager,
  useRootUser,
} from '../../../../core/cfds/react/graph.tsx';
import { GraphManager } from '../../../../../../cfds/client/graph/graph-manager.ts';
import {
  NS_TAGS,
  SchemeNamespace,
} from '../../../../../../cfds/base/scheme-types.ts';
import { VertexManager } from '../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  usePartialVertex,
  useVertex,
} from '../../../../core/cfds/react/vertex.ts';
import { useLogger } from '../../../../core/cfds/react/logger.tsx';
import { useCallback } from 'https://esm.sh/v96/@types/react@18.0.21/index.d.ts';
import {
  useQuery2,
  useSharedQuery,
} from '../../../../core/cfds/react/query.ts';

const useStyles = makeStyles((theme) => ({
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
  setName: (name: string) => void;
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
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
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
  const blur = (_e: FocusEvent) => {
    commit();
  };

  const onKeyDown = (e: KeyboardEvent) => {
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
  readonly isNew: boolean;
  // onCommit: (cRec: ChangeRecord) => void;
}

interface IParentTagPillInfo extends ITagPillInfo {
  readonly graphMng: GraphManager;
  readonly color: string;
  readonly children: ITagPillInfo[];
  readonly workspace: Workspace;
  readonly isDeleted: boolean;

  // onParentCommit: (cRec: ChangeRecord) => void;
}

interface TagPillProps {
  manager: VertexManager<Tag>;
  // isChild: boolean;
  // color: string;
  setRowEditing: (flag: boolean) => void;
  // logAction: (action: WSActionNames) => void;
}
function TagPill({
  manager,
  // isChild,
  // color,
  setRowEditing,
}: // logAction,
TagPillProps) {
  const styles = useStyles();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<any>();
  const tag = usePartialVertex(manager, ['name', 'isDeleted']);
  const logger = useLogger();

  const onClick = useCallback(() => {
    // logAction('TAG_SETTINGS_TAG_FOCUSED');
    if (!isEditing) {
      logger.log({
        severity: 'INFO',
        event: 'Start',
        flow: 'edit',
        source: 'settings:tags',
        type: 'name',
        vertex: tag.key,
      });
    }
    setIsEditing(true);
    setRowEditing(true);
    inputRef.current.focus();

    if (inputRef.current.setSelectionRange) {
      inputRef.current.setSelectionRange(0, tag.name.length);
    }
    requestAnimationFrame(() => {
      inputRef.current.focus();
    });
  }, [logger, tag]);

  const removeTag = (e: MouseEvent) => {
    e.stopPropagation();
    tag.isDeleted = 1;
    logger.log({
      severity: 'INFO',
      event: 'End',
      flow: 'delete',
      type: tag.parentTag ? 'tag' : 'tag-category',
      vertex: tag.key,
      source: 'settings:tags',
    });
    tag.isDeleted = 1;
  };
  const onBlur = () => {
    if (isEditing) {
      logger.log({
        severity: 'INFO',
        event: 'Start',
        flow: 'edit',
        source: 'settings:tags',
        type: 'name',
        vertex: tag.key,
      });
    }
    setIsEditing(false);
    setRowEditing(false);
  };
  if (tag.isDeleted) {
    return null;
  }

  return (
    <div className={cn(styles.pillRoot)}>
      <div
        className={cn(
          styles.pillSize,
          styles.tagPill,
          tag.parentTag && styles.tagChildPill,
          isEditing && styles.invisible
        )}
        onClick={onClick}
      >
        <div className={cn(styles.deleteIcon)} onClick={removeTag}>
          <DeleteIcon />
        </div>
      </div>
      <TagInput
        name={tag.name}
        setName={(x) => (tag.name = x)}
        className={cn(styles.pillInput, !isEditing && styles.invisible)}
        onBlur={onBlur}
        ref={inputRef}
      />
    </div>
  );
}

interface AddSubTagButtonProps {
  onClicked: () => void;
}
function AddSubTagButton({ onClicked }: AddSubTagButtonProps) {
  return (
    <Button onClick={onClicked}>
      <IconAdd size={12} fill="#000" />
    </Button>
  );
}

// interface ColorDrawerProps {
//   color: string;
//   setColor: React.Dispatch<React.SetStateAction<string>>;
//   className?: string;
// }
// function ColorDrawer({ color, setColor, className }: ColorDrawerProps) {
//   const styles = useStyles();
//   const onColorClick = (e, c) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (c !== color) {
//       setColor(c);
//     }
//   };

//   //TODO: Amit: Key missing Error
//   return (
//     <Layer>
//       {({ zIndex }) => (
//         <div style={{ zIndex }} className={cn(styles.drawer, className)}>
//           <Text>Color</Text>
//           {COLORS.map((c) => (
//             <ColorButton
//               key={c}
//               color={c}
//               size="xsmall"
//               isSelected={color === c}
//               onMouseDown={(e) => onColorClick(e, c)}
//               className={cn(styles.colorButton)}
//             />
//           ))}
//         </div>
//       )}
//     </Layer>
//   );
// }

interface ParentTagRowProps {
  manager: VertexManager<Tag>;
  // logAction: (action: string) => void;
}

function ParentTagRow({ manager }: ParentTagRowProps) {
  const tag = useVertex(manager);
  const styles = useStyles();
  const [rowEditing, setRowEditing] = useState(false);
  const logger = useLogger();
  const childTagQueries = useQuery2(tag.childTagsQuery);

  // const [children, setChildren] = useState<ITagPillInfo[]>(tag.children);
  const ref = useRef<any>();

  // const changeRecord = useChangeRecord(`${tag.key}-row`, (r) => {
  //   tag.onParentCommit(r);
  // });

  // const color = changeRecord.get('color') || tag.color;
  // useEffect(() => {
  //   if (ref.current) {
  //     ref.current.style.setProperty('--tag-color', color);
  //     ref.current.style.setProperty('--tag-bg-color', makeTransparent(color));
  //   }
  // }, [color]);

  // const onColorChanged = (c) => {
  //   changeRecord.set('color', c);
  //   logAction('TAG_SETTINGS_COLOR_CHANGED');
  // };

  if (tag.isDeleted) {
    return null;
  }

  const onAddSubTag = () => {
    const newChild = tag.graph.createVertex(NS_TAGS, {
      parentTag: tag.key,
    });
    logger.log({
      severity: 'INFO',
      event: 'Create',
      type: 'tag',
      vertex: newChild.key,
      source: 'settings:tags',
    });
  };

  return (
    <div className={cn(styles.row)} ref={ref}>
      <TagPill key={tag.key} manager={manager} setRowEditing={setRowEditing} />
      {childTagQueries.map((x) => (
        <TagPill
          key={x.key}
          manager={x.manager}
          setRowEditing={setRowEditing}
        />
      ))}
      <AddSubTagButton onClicked={onAddSubTag} />
    </div>
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
  const parentTagsQuery = useSharedQuery('parentTags');
  const logger = useLogger();
  const graph = useGraphManager();
  // const [tags, setTags] = useState<IParentTagPillInfo[]>([]);

  // useEffect(() => {
  //   setTags(
  //     tagTree.parents.map(
  //       (x) => new ExistParentTagPillInfo(graphMng, x, eventLogger)
  //     )
  //   );
  // }, [graphMng, tagTree, eventLogger]);

  // const logAction = (action: WSActionNames) => {
  //   eventLogger.wsAction(action, workspaceManager, {
  //     category: EventCategory.WS_SETTINGS,
  //   });
  // };

  const onCreateParentTag = useCallback(() => {
    // const newTags = [
    //   new NewParentTagPillInfo(
    //     graphMng,
    //     workspaceManager,
    //     currentUser.id,
    //     eventLogger
    //   ),
    //   ...tags,
    // ];
    // setTags(newTags);
    // eventLogger.wsAction('TAG_SETTINGS_CREATE_PARENT_TAG', workspaceManager, {
    //   category: EventCategory.WS_SETTINGS,
    // });
    const parent = graph.createVertex<Tag>(NS_TAGS, {
      name: 'Untitled Category',
    });
    graph.createVertex<Tag>(NS_TAGS, {
      parentTag: parent.key,
      name: 'Untitled',
    });
    logger.log({
      severity: 'INFO',
      event: 'Create',
      vertex: parent.key,
      type: 'tag-category',
      source: 'settings:tags',
    });
  }, [logger, graph]);

  return (
    <div style={style} className={cn(styles.root, className)}>
      <Scroller>
        {(ref) => (
          <div className={cn(styles.settings)} ref={ref}>
            {parentTagsQuery.map((tag) => (
              <ParentTagRow manager={tag.manager} />
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

// class ExistTagPillInfo implements ITagPillInfo {
//   private _tag: Tag;
//   protected _eventLogger: EventLogger;

//   constructor(tag: Tag, eventLogger: EventLogger) {
//     this._tag = tag;
//     this._eventLogger = eventLogger;
//   }

//   get key() {
//     return this._tag.key;
//   }

//   get name() {
//     return this._tag.name;
//   }

//   get isNew() {
//     return false;
//   }

//   onCommit(r: ChangeRecord) {
//     const changedName = r.get('name');

//     if (changedName) {
//       this._tag.name = changedName;

//       this._eventLogger.wsAction('TAG_UPDATED', this._tag.workspace, {
//         category: EventCategory.WS_SETTINGS,
//         tagId: this._tag.key,
//         parentTagId: this._tag.parentTag?.key,
//       });
//     }
//     if (r.get('isDeleted')) {
//       this._tag.isDeleted = 1;

//       this._eventLogger.wsAction('TAG_DELETED', this._tag.workspace, {
//         category: EventCategory.WS_SETTINGS,
//         tagId: this._tag.key,
//         parentTagId: this._tag.parentTag?.key,
//       });
//     }
//   }

//   onDelete() {}
// }

// class ExistParentTagPillInfo
//   extends ExistTagPillInfo
//   implements IParentTagPillInfo
// {
//   private _graphMng: GraphManager;
//   private _group: TagGroup;
//   private _children: ITagPillInfo[];

//   constructor(
//     graphMng: GraphManager,
//     tagGroup: TagGroup,
//     eventLogger: EventLogger
//   ) {
//     super(tagGroup.parentTag, eventLogger);
//     this._graphMng = graphMng;
//     this._group = tagGroup;
//     this._children = tagGroup.children.map(
//       (x) => new ExistTagPillInfo(x, eventLogger)
//     );
//   }

//   get isDeleted() {
//     return this._group.parentTag.isDeleted !== 0;
//   }

//   get workspace() {
//     return this._group.parentTag.workspace;
//   }

//   get graphMng() {
//     return this._graphMng;
//   }

//   get key() {
//     return this._group.parentTag.key;
//   }

//   get name() {
//     return this._group.parentTag.name;
//   }

//   get parentTag() {
//     return this._group.parentTag;
//   }

//   get isNew() {
//     return false;
//   }

//   get color() {
//     return this._group.parentTag.color;
//   }

//   get children() {
//     return this._children;
//   }

//   onParentCommit(cRec: ChangeRecord) {
//     const color = cRec.get('color');
//     if (color) {
//       this._group.parentTag.color = color;

//       this._eventLogger.wsAction(
//         'TAG_UPDATED',
//         this._group.parentTag.workspace,
//         {
//           category: EventCategory.WS_SETTINGS,
//           tagId: this._group.parentTag.key,
//         }
//       );
//     }
//     if (cRec.get('isDeleted')) {
//       this._group.parentTag.isDeleted = 1;

//       this._group.children.forEach((c) => {
//         c.isDeleted = 1;

//         this._eventLogger.wsAction('TAG_DELETED', c.workspace, {
//           category: EventCategory.WS_SETTINGS,
//           tagId: c.key,
//           parentTagId: this._group.parentTag.key,
//         });
//       });
//     }
//   }
// }

// class NewParentTagPillInfo implements IParentTagPillInfo {
//   private _key: string;
//   private _eventLogger: EventLogger;
//   private _children: NewSubTagPillInfo[];
//   private _graphMng: GraphManager;
//   private _workspaceManager: VertexManager<Workspace>;
//   private _createdBy: string;
//   private _color: string;
//   private _isDeleted: boolean;

//   constructor(
//     graphMng: GraphManager,
//     workspaceManager: VertexManager<Workspace>,
//     createdBy: string,
//     eventLogger: EventLogger
//   ) {
//     this._key = 'parent-key' + Utils.uniqueId();
//     this._graphMng = graphMng;
//     this._workspaceManager = workspaceManager;
//     this._createdBy = createdBy;
//     this._eventLogger = eventLogger;
//     this._children = [];
//     this._color = COLORS[0];
//     this._isDeleted = false;
//   }

//   get isDeleted() {
//     return this._isDeleted;
//   }

//   get workspace() {
//     return this._workspaceManager.getVertexProxy();
//   }

//   get graphMng() {
//     return this._graphMng;
//   }

//   get key() {
//     return this._key;
//   }

//   get name() {
//     return '';
//   }

//   get isNew() {
//     return true;
//   }

//   get color() {
//     return this._color;
//   }

//   get children() {
//     return this._children;
//   }

//   onParentCommit(cRec: ChangeRecord) {
//     this._color = cRec.get('color');
//   }

//   onCommit(cRec: ChangeRecord) {
//     const isDeleted = cRec.get('isDeleted');
//     if (isDeleted !== undefined && (isDeleted === true || isDeleted === 1)) {
//       this._isDeleted = true;
//       return;
//     }

//     const newTag = this._graphMng.createVertex<Tag>(SchemeNamespace.TAGS, {
//       workspace: this._workspaceManager.key,
//       color: this._color,
//       name: cRec.get('name'),
//       createdBy: this._createdBy,
//     });

//     this._key = newTag.key;

//     this._eventLogger.wsAction('TAG_CREATED', this._workspaceManager, {
//       tagId: newTag.key,
//       parentTagId: newTag.parentTag?.key,
//     });
//   }
// }

// class NewSubTagPillInfo implements ITagPillInfo {
//   private _key: string;
//   private _parent: IParentTagPillInfo;
//   private _graphMng: GraphManager;
//   private _createdBy: string;
//   private _eventLogger: EventLogger;

//   constructor(
//     parent: IParentTagPillInfo,
//     createdBy: string,
//     eventLogger: EventLogger
//   ) {
//     this._key = 'new-' + Utils.uniqueId();
//     this._parent = parent;
//     this._graphMng = parent.graphMng;
//     this._createdBy = createdBy;
//     this._eventLogger = eventLogger;
//   }

//   get key() {
//     return this._key;
//   }

//   get name() {
//     return '';
//   }

//   get isNew() {
//     return true;
//   }

//   onCommit(changeRec: ChangeRecord) {
//     if (this._parent.isDeleted) return;

//     const isDeleted = changeRec.get('isDeleted');
//     if (isDeleted !== undefined && (isDeleted === true || isDeleted === 1)) {
//       return;
//     }

//     const newTag = this._graphMng.createVertex<Tag>(SchemeNamespace.TAGS, {
//       workspace: this._parent.workspace.key,
//       color: this._parent.color,
//       name: changeRec.get('name'),
//       createdBy: this._createdBy,
//       parentTag: this._parent.key,
//     });

//     this._eventLogger.wsAction('TAG_CREATED', newTag.workspace, {
//       tagId: newTag.key,
//       parentTagId: newTag.parentTag?.key,
//     });
//   }
// }
