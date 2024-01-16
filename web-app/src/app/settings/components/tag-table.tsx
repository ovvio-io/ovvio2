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
import { uniqueId } from '../../../../../base/common.ts';
import { between, present } from '../../../../../cfds/base/orderstamp.ts';
import { past } from '../../../../../cfds/base/orderstamp.ts';

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
    position: 'relative',
    justifyContent: 'flex-start',
    display: 'flex',
    flexDirection: 'row',
    gap: '4px',
    padding: '18px 26px 17px 16px',
  },

  CategoryColumnStyle: {
    width: '160px',
    maxWidth: '160px',
  },

  categoryPill: {
    padding: '2px 4px 2px 8px',
    minWidth: '20px',
    width: 'auto',
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
    width: '510px',
    maxWidth: '510px',
    alignItems: 'center',
    flexFlow: 'row wrap',
    gap: '4px',
  },
  flexColumnTags: {
    display: 'flex',
    flexFlow: 'row wrap',
    gap: '4px',
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

  useEffect(() => {
    category.name = categoryName;
  }, [categoryName]);

  useEffect(() => {
    if (isNewCategory || (editMode && inputRef?.current)) {
      inputRef?.current?.focus();
    }
  }, [isNewCategory, editMode]);

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    setCategoryName(e.currentTarget.textContent || '');
  };

  return (
    <div className={cn(styles.categoryPill, editMode && styles.editPill)}>
      <div
        id={String(uniqueId())}
        className={cn(styles.categoryInputPill)}
        onInput={onInput}
        placeholder="untitled"
        maxLength="14"
        contentEditable={
          !editMode && !isNewCategory ? 'false' : 'plaintext-only'
        }
        suppressContentEditableWarning={true}
      >
        {categoryName}
      </div>
    </div>
  );
};

//=========================================================================================TagPills===========================

type TagPillsProps = {
  tag: Tag;
  editMode: boolean;
  reorderMode: boolean;
  onReorder: (tag: Tag, direction: string) => void;
  deleteTag: () => void;
  isNewCategory: boolean;
};

const TagPills = React.forwardRef<HTMLInputElement, TagPillsProps>(
  (
    { tag, editMode, reorderMode, deleteTag, isNewCategory, onReorder },
    ref
  ) => {
    const styles = useStyles();

    const [tagName, setTagName] = useState<string>(tag.name);

    useEffect(() => {
      tag.name = tagName;
    }, [tagName]);

    const onInput = (e: React.FormEvent<HTMLDivElement>) => {
      setTagName(e.currentTarget.textContent || '');
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
          <Button
            className={cn(styles.deleteIcon)}
            onClick={() => onReorder(tag, 'right')}
          >
            <img
              key="MoveLeftTagSettings"
              src="/icons/settings/Move-left.svg"
            />
          </Button>
        )}
        <div
          id={String(uniqueId())}
          className={cn(styles.tagInputPill)}
          onInput={onInput}
          placeholder="untitled"
          readOnly={!editMode && !isNewCategory}
          contentEditable={
            !editMode && !isNewCategory ? 'false' : 'plaintext-only'
          }
          suppressContentEditableWarning={true}
          ref={ref as React.RefObject<HTMLInputElement>}
        >
          {tagName}
        </div>
        {editMode && (
          <div className={cn(styles.deleteIcon)} onClick={deleteTag}>
            <img key="DeleteTagSettings" src="/icons/settings/Close-big.svg" />
          </div>
        )}
        {reorderMode && (
          <Button
            className={cn(styles.deleteIcon)}
            onClick={() => onReorder(tag, 'left')}
          >
            <img
              key="MoveRightTagSettings"
              src="/icons/settings/Move-right.svg"
            />
          </Button>
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

  const handleReorderTag = (tag: Tag, direction: string) => {
    if (!childTags || !tag) return;
    const tagIndex = childTags.indexOf(tag);

    if (tagIndex === -1) return;
    if (direction === 'left' && tagIndex > 0) {
      // Moving left - need to place between the previous and the one before it
      const prevTagSortStamp = childTags[tagIndex - 1].sortStamp;
      const prevPrevTagSortStamp =
        tagIndex > 1 ? childTags[tagIndex - 2].sortStamp : past();
      tag.sortStamp = between(prevPrevTagSortStamp, prevTagSortStamp);
    } else if (direction === 'right' && tagIndex < childTags.length - 1) {
      // Moving right - need to place between the next and the one after it
      const nextTagSortStamp = childTags[tagIndex + 1].sortStamp;
      const nextNextTagSortStamp =
        tagIndex < childTags.length - 2
          ? childTags[tagIndex + 2].sortStamp
          : present();
      tag.sortStamp = between(nextTagSortStamp, nextNextTagSortStamp);
    }
  };

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
    childTags.sort((a, b) => coreValueCompare(a.sortStamp, b.sortStamp));

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
            inputRef={isNew ? newCategoryRef : undefined}
          />
        </div>
        <div className={cn(styles.TagsColumnStyle)}>
          <div className={cn(styles.flexColumnTags)}>
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
                key={tag.key}
                tag={tag}
                editMode={isEditMode}
                reorderMode={isReorderMode}
                // deleteTag={() => deleteTag(tag)}
                deleteTag={() => deleteTag(tag.key)}
                isNewCategory={false}
                ref={index === childTags.length - 1 ? lastTagRef : null}
                onReorder={handleReorderTag}
              />
            ))}
          </div>
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
            newCategoryRef={newCategoryRef}
            isNew={newCategoryVertex === category}
            graphManager={graphManager}
            workspaceManagerKey={workspaceManager.key}
          />
        ))}
      </div>
    </div>
  );
};
