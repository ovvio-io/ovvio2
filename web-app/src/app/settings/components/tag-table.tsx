import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { Button } from '../../../../../styles/components/buttons.tsx';
import Menu, { MenuAction } from '../../../../../styles/components/menu.tsx';
import { RefObject } from 'https://esm.sh/v96/@types/react@18.2.15/index.js';
import {
  Tag,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { SchemeNamespace } from '../../../../../cfds/base/scheme-types.ts';
import { GraphManager } from '../../../../../cfds/client/graph/graph-manager.ts';
import { coreValueCompare } from '../../../../../base/core-types/comparable.ts';
import { useVertex } from '../../../core/cfds/react/vertex.ts';
import { layout } from '../../../../../styles/layout.ts';

const useStyles = makeStyles(() => ({
  tableContainer: {
    position: 'relative',
    top: '64px',
    width: '100%',
  },

  rowLayout: {
    boxShadow: 'inset rgba(151, 132, 97, 0.25) 0px 2px 5px -2px',
    backgroundColor: 'var(--Monochrom-M0, #FFF)',
  },

  row: {
    display: 'flex',
    minHeight: '56px',
    flexWrap: 'wrap',
    padding: '0px 8px 0px 0px',
    position: 'relative',
    alignItems: 'center',
    width: '670px',
    borderBottom: '1px solid var(--Primary-P2, #E0EEF4)', // New border top style
    // borderTop: '1px solid var(--Primary-P2, #E0EEF4)', // New border top style
    ':hover': {
      backgroundColor: '#FBF6EF',
      itemMenu: {
        opacity: 1,
      },
    },
  },

  rowContent: {
    basedOn: [layout.row],
    position: 'relative',
    justifyContent: 'flex-start',
    gap: '4px',
    padding: '18px 26px 17px 16px',
  },

  CategoryColumnStyle: {
    width: '160px',
    maxWidth: '160px',
  },

  categoryPill: {
    padding: '2px 4px 2px 8px',
    minWidth: '40px',
    maxWidth: '160px',
    width: '160px',
  },

  editPill: {
    borderRadius: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderColor: '#CCCCCC',
    width: 'fit-content',
  },

  categoryInputPill: {
    color: '#000000',
    fontSize: '14px',
    lineHeight: '21px',
    letterSpacing: '0.0.87px',
    fontWeight: '600',
    outline: 'none',
    border: 'none',
    backgroundColor: 'transparent',
    padding: '0px 8px 0px 8px',
    background: 'transparent',
    display: 'flex',
  },

  TagsColumnStyle: {
    display: 'flex',
    width: '70%',
    maxWidth: '510px',
    alignItems: 'center',
    flexFlow: 'row wrap',
    gap: '4px',
    marginRight: '96px',
  },
  tagPillSize: {
    borderRadius: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    backgroundColor: '#E5E5E5',
    minWidth: '40px',
    maxWidth: '260px',
  },
  tagPill: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    color: 'var(--tag-color)',
    marginRight: styleguide.gridbase,
    padding: '2px 4px 2px 4px',
  },
  tagInputPill: {
    fontSize: '10px',
    lineHeight: '14px',
    outline: 'none',
    border: 'none',
    padding: '0px 8px 0px 8px',
    backgroundColor: 'transparent',
    minWidth: '20px',
    fontWeight: '400',
    background: 'transparent',
  },
  moreButtonColumn: {
    position: 'absolute',
    right: '8px',
  },
  newCategory: {
    display: 'flex',
    width: ' 154px',
    height: '44px',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
  },
  newCategoryText: {
    fontSize: '13px',
    lineHeight: 'normal',
    letterSpacing: '0.0.75px',
    fontWeight: '400',
  },
  addButton: {
    display: 'flex',
    gap: '8px',
  },
  scrollTable: {
    maxHeight: '700px',
    overflowY: 'scroll',
    overflowX: 'visible',
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
  },

  itemMenu: {
    opacity: 0,
    ...styleguide.transition.short,
    transitionProperty: 'opacity',
  },
  itemMenuOpen: {
    opacity: 1,
  },
  hoverableRow: {
    ':hover': {
      backgroundColor: '#FBF6EF',
    },
  },

  deleteIcon: {
    width: styleguide.gridbase * 2,
    height: styleguide.gridbase * 2,
    cursor: 'pointer',
  },
}));

interface ImageIconProps {
  width?: string;
  height?: string;
  src: string;
  alt?: string;
}
export const ImageIcon: React.FC<ImageIconProps> = ({
  width,
  height,
  src,
  alt,
}) => {
  return <img src={src} alt={alt || 'icon'} width={width} height={height} />;
};

function useOutsideClick<T extends HTMLElement>(
  ref: RefObject<T>,
  callback: () => void
): void {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
}

//=========================================================================================CategoryPill===========================

type CategoryPillProps = {
  categoryVertex: VertexManager<Tag>;
  editMode: boolean;
  isNewCategory: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
};

const CategoryPill: React.FC<CategoryPillProps> = ({
  categoryVertex,
  editMode,
  isNewCategory,
  inputRef,
}) => {
  const styles = useStyles();
  const category = useVertex(categoryVertex) as Tag;
  const [categoryName, setCategoryName] = useState<string>(category.name);
  const [inputWidth, setInputWidth] = useState(`${categoryName.length * 10}px`);

  useEffect(() => {
    category.name = categoryName;
  }, [categoryName]);

  useEffect(() => {
    if (isNewCategory || (editMode && inputRef?.current)) {
      inputRef?.current?.focus();
    }
  }, [isNewCategory, editMode]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCategoryName(e.target.value);
    setInputWidth((categoryName.length + e.target.value.length) * 5 + 'px');
  };

  return (
    <div className={cn(styles.categoryPill, editMode && styles.editPill)}>
      <input
        className={cn(styles.categoryInputPill)}
        type="text"
        value={categoryName}
        maxlength="14"
        onChange={onChange}
        readOnly={!editMode && !isNewCategory}
        placeholder="untitled"
        style={{ width: inputWidth }}
      />
    </div>
  );
};

//=========================================================================================TagPills===========================

type TagPillsProps = {
  tag: Tag;
  editMode: boolean;
  reorderMode: boolean;

  deleteTag: () => void;
  isNewCategory: boolean;
};

const TagPills = React.forwardRef<HTMLInputElement, TagPillsProps>(
  ({ tag, editMode, reorderMode, deleteTag, isNewCategory }, ref) => {
    const styles = useStyles();
    const [tagName, setTagName] = useState<string>(tag.name);

    useEffect(() => {
      tag.name = tagName;
    }, [tagName]);

    const [inputWidth, setInputWidth] = useState<string>(
      (tagName.length + 1) * 5 + 'px'
    );

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTagName(e.target.value);
      setInputWidth((tagName.length + e.target.value.length - 1) * 3 + 'px');
    };

    return (
      <div
        className={cn(
          styles.tagPillSize,
          styles.tagPill,
          (editMode || reorderMode) && styles.editPill
        )}
        style={{
          backgroundColor: editMode || reorderMode ? 'transparent' : '#E5E5E5',
        }}
      >
        {reorderMode && (
          <div className={cn(styles.deleteIcon)} onClick={() => {}}>
            <img
              key="MoveLeftTagSettings"
              src="/icons/settings/Move-left.svg"
            />
          </div>
        )}
        <input
          className={cn(styles.tagInputPill)}
          type="text"
          ref={ref as React.RefObject<HTMLInputElement>}
          value={tagName}
          onChange={onChange}
          onBlur={blur}
          readOnly={!editMode}
          style={{ width: inputWidth }}
        />
        {editMode && (
          <div className={cn(styles.deleteIcon)} onClick={deleteTag}>
            <img key="DeleteTagSettings" src="/icons/settings/Close-big.svg" />
          </div>
        )}
        {reorderMode && (
          <div className={cn(styles.deleteIcon)} onClick={() => {}}>
            <img
              key="MoveRightTagSettings"
              src="/icons/settings/Move-right.svg"
            />
          </div>
        )}
      </div>
    );
  }
);

//==================================================================================TableRowCategory==================================
type TableRowCategoryProps = {
  graphManager: GraphManager;
  categoryVertex: VertexManager<Tag>;
  workspaceManagerKey: string;
  isNew: boolean;
  newCategoryRef: React.RefObject<HTMLInputElement>;
};
const TableRowCategory: React.FC<TableRowCategoryProps> = ({
  graphManager,
  categoryVertex,
  workspaceManagerKey,
  isNew,
  newCategoryRef,
}) => {
  const category = useVertex(categoryVertex) as Tag;
  // const { childTags } = usePartialVertex(category, ['childTags']);
  const { childTags } = category;
  const styles = useStyles();
  const rowRef = useRef<HTMLDivElement>(null);
  const lastTagRef = useRef<HTMLInputElement>(null);
  const [isNewCategory, setIsNewCategory] = useState(isNew);
  const [isEditMode, setIsEditMode] = useState(isNewCategory);
  const [isReorderMode, setIsReorderMode] = useState(false);

  const [newTagVertex, setNewTagVertex] = useState<
    VertexManager<Tag> | undefined
  >(undefined);

  const handleOnCreateTag = () => {
    const createdVertex = graphManager.createVertex<Tag>(SchemeNamespace.TAGS, {
      workspace: workspaceManagerKey,
      parentTag: category.key,
    });
    setNewTagVertex(createdVertex.manager);
  };

  if (newTagVertex?.getVertexProxy().isDeleted) {
    setNewTagVertex(undefined);
  }
  const handleOnDeleteCategory = () => {
    category.isDeleted = 1;
  };

  useEffect(() => {
    if (lastTagRef.current) {
      lastTagRef.current.focus();
    }
  }, [childTags]);

  // const deleteTag = (tagToDelete: Tag) => {
  //   tagToDelete.isDeleted = 1;
  // };
  const deleteTag = (tagKey: string) => {
    const tagToDelete = childTags.find((tag) => tag.key === tagKey);
    if (tagToDelete) {
      tagToDelete.isDeleted = 1;
    }
  }; //TODO: need to be fixed (removes the right tag but shows like always the last one is removed)

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };
  const toggleReorderMode = () => {
    setIsReorderMode(!isReorderMode);
  };
  const closeModes = (): void => {
    setIsEditMode(false);
    setIsNewCategory(false);
    setIsReorderMode(false);
  };

  useOutsideClick(rowRef, closeModes);

  const renderButton = useCallback(
    ({ isOpen }: { isOpen: boolean }) => (
      <div
        className={cn(
          styles.moreButtonColumn,
          isOpen ? styles.itemMenuOpen : styles.itemMenu
        )}
      >
        <img key="MoreButtonTagSettings" src="/icons/settings/More.svg" />
      </div>
    ),
    []
  );

  return (
    <div ref={rowRef} className={cn(styles.row, styles.rowLayout)}>
      <div className={cn(styles.rowContent)}>
        <div className={cn(styles.CategoryColumnStyle)}>
          <CategoryPill
            isNewCategory={isNew}
            categoryVertex={categoryVertex}
            editMode={isEditMode}
            inputRef={isNew ? newCategoryRef : undefined} // Pass the ref to CategoryPill
          />
        </div>
        <div className={cn(styles.TagsColumnStyle)}>
          {isEditMode && (
            <Button
              className={cn(styles.addButton)}
              onClick={handleOnCreateTag}
            >
              <img key="AddTagSettings" src="/icons/settings/Add.svg" />
            </Button>
          )}
          {childTags.map((tag: Tag, index) => (
            <TagPills
              key={`${tag}-${index}`}
              tag={tag}
              editMode={isEditMode}
              reorderMode={isReorderMode}
              // deleteTag={() => deleteTag(tag)}
              deleteTag={() => deleteTag(tag.key)} // Pass tag key here
              isNewCategory={false}
              ref={index === childTags.length - 1 ? lastTagRef : null}
            />
          ))}
        </div>
      </div>
      {!isEditMode && !isNewCategory && (
        <div className={cn(styles.moreButtonColumn)}>
          <Menu
            renderButton={renderButton}
            position="right"
            align="center"
            direction="out"
          >
            <MenuAction
              IconComponent={(props: ImageIconProps) => (
                <ImageIcon
                  {...props}
                  src="/icons/settings/Compose.svg"
                  alt="Edit"
                />
              )}
              text="Edit"
              onClick={toggleEditMode}
            ></MenuAction>
            <MenuAction
              IconComponent={(props: ImageIconProps) => (
                <ImageIcon
                  {...props}
                  src="/icons/settings/Reorder.svg"
                  alt="Reorder"
                />
              )}
              text="Reorder"
              onClick={toggleReorderMode}
            ></MenuAction>
            <MenuAction
              IconComponent={(props: ImageIconProps) => (
                <ImageIcon
                  {...props}
                  src="/icons/settings/Delete.svg"
                  alt="Delete"
                />
              )}
              onClick={handleOnDeleteCategory}
              text="Delete"
            ></MenuAction>
          </Menu>
        </div>
      )}
    </div>
  );
};

//=====================================================================================TagsTable===============================
type TagsTableProps = {
  workspaceManager: VertexManager<Workspace>;
  graphManager: GraphManager;
};

export const TagsTable: React.FC<TagsTableProps> = ({
  workspaceManager,
  graphManager,
}) => {
  const styles = useStyles();
  const categoriesQuery = useSharedQuery('parentTagsByWorkspace').group(
    workspaceManager
  );
  const [newCategoryVertex, setNewCategoryVertex] = useState<
    VertexManager<Tag> | undefined
  >(undefined);

  const newCategoryRef = useRef<HTMLInputElement>(null);

  categoriesQuery.sort((a, b) => {
    if (a.key === newCategoryVertex?.key) {
      return -1;
    } else if (b.key == newCategoryVertex?.key) {
      return 1;
    }
    return coreValueCompare(a, b);
  });

  const handleNewCategory = () => {
    const createdVertex = graphManager.createVertex<Tag>(SchemeNamespace.TAGS, {
      workspace: workspaceManager.key,
    });
    // const vertexManager = graphManager.getVertexManager<Tag>(createdVertex);
    setNewCategoryVertex(createdVertex.manager);
  };

  if (newCategoryVertex?.getVertexProxy().isDeleted) {
    setNewCategoryVertex(undefined);
  }

  return (
    <div className={cn(styles.tableContainer)}>
      <div
        className={cn(styles.newCategory, styles.rowLayout)}
        onClick={handleNewCategory}
      >
        <div className={cn(styles.addButton)}>
          <img key="AddTagSettings" src="/icons/settings/Add.svg" />
          <div className={cn(styles.newCategoryText)}>New Category</div>
        </div>
      </div>
      <div className={cn(styles.scrollTable)}>
        {categoriesQuery.map((category, index) => (
          <TableRowCategory
            key={`${category.key}-${index}`}
            categoryVertex={category}
            newCategoryRef={newCategoryRef} // Pass the ref down
            isNew={newCategoryVertex === category}
            graphManager={graphManager}
            workspaceManagerKey={workspaceManager.key}
          />
        ))}
      </div>
    </div>
  );
};
