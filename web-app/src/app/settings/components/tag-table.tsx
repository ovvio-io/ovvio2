import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  RefObject,
} from 'react';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { Button } from '../../../../../styles/components/buttons.tsx';
import Menu, { MenuAction } from '../../../../../styles/components/menu.tsx';
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
import { ConfirmationDialog } from '../../../../../styles/components/confirmation-menu.tsx';
import { WhiteActionButton } from './settings-buttons.tsx';
import { DeleteWithConfirmation } from '../../../../../styles/components/confirmation-menu.tsx';

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
    borderBottom: '1px solid var(--Primary-P2, #E0EEF4)',
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
    padding: '0px 4px 2px 8px',
    minWidth: '20px',
    maxWidth: '160px',
    width: 'auto',
  },

  editPill: {
    borderRadius: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    border: '1px solid',
    borderColor: '#CCCCCC',
    width: 'fit-content',
  },

  categoryInputPill: {
    color: '#000000',
    fontSize: '14px',
    lineHeight: '21px',
    letterSpacing: '0.0.87px',
    fontFamily: 'PoppinsBold, HeeboBold',
    outline: 'none',
    border: 'none',
    backgroundColor: 'transparent',
    padding: '0px 8px 0px 3px',
    background: 'transparent',
    display: 'block',
    maxWidth: '100%',
    minWidth: '100px',

    overflowWrap: ' break-word',
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
    alignItem: 'center',
  },
  tagPillSize: {
    borderRadius: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    backgroundColor: '#E5E5E5',
    minWidth: '20px',
    maxWidth: '260px',
  },
  tagPill: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    color: 'var(--tag-color)',
    padding: '2px 4px 2px 4px',
    justifyContent: 'center',
    width: 'auto',
  },
  tagInputPill: {
    fontSize: '10px',
    lineHeight: '14px',
    outline: 'none',
    border: 'none',
    padding: '0px 2px',
    backgroundColor: 'transparent',
    background: 'transparent',
    maxWidth: '100%',
    overflowWrap: ' break-word',
    minWidth: '20px',
    display: 'flex',
    justifyContent: 'center',
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

  deleteIcon: {
    width: styleguide.gridbase * 2,
    height: styleguide.gridbase * 2,
    cursor: 'pointer',
    display: 'contents',
  },
  highlightedTag: {
    border: '3px solid red',
    transition: ' border 2s linear',
  },
  popup: {
    backgroundColor: '#ffff',
    maxWidth: styleguide.gridbase * 21,
    maxHeight: styleguide.gridbase * 21,
    flexShrink: 0,
    zIndex: 20,
    position: 'fixed',
    border: '2px solid #F5ECDC',
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
  }, [callback]);
}

//=========================================================================================CategoryPill===========================

type CategoryPillProps = {
  categoryVertex: VertexManager<Tag>;
  editMode: boolean;
  isNewCategory: boolean;
};

const CategoryPill: React.FC<CategoryPillProps> = ({
  categoryVertex,
  editMode,
  isNewCategory,
}) => {
  const styles = useStyles();
  const category = useVertex(categoryVertex) as Tag;
  const [categoryName, setCategoryName] = useState<string>(category.name);

  useEffect(() => {
    category.name = categoryName;
  }, [categoryName]);

  const inputId = `category-input-${String(uniqueId())}`;

  useEffect(() => {
    if (isNewCategory) {
      const inputElement = document.getElementById(inputId);
      if (inputElement) {
        inputElement.focus();
      }
    }
  }, [isNewCategory]);

  const contentEditableRef = useRef<HTMLInputElement>(null);

  const handleOnInput = () => {
    if (contentEditableRef.current) {
      const content = contentEditableRef.current.textContent;
      content && setCategoryName(content);
    }
  };

  useLayoutEffect(() => {
    if (contentEditableRef.current) {
      contentEditableRef.current.textContent = category.name;
    }
  }, [category]);

  const handleOnBlur = () => {
    if (
      contentEditableRef.current &&
      contentEditableRef.current['textContent'] === ''
    ) {
      setCategoryName('Untitled');
    }
  };
  if (category.isDeleted) {
    return null;
  }

  return (
    <div className={cn(styles.categoryPill, editMode && styles.editPill)}>
      <div
        id={inputId}
        className={cn(styles.categoryInputPill)}
        onInput={handleOnInput}
        onBlur={handleOnBlur}
        contentEditable={
          !editMode && !isNewCategory ? 'false' : 'plaintext-only'
        }
        suppressContentEditableWarning={true}
        ref={contentEditableRef}
      />
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
  uniqueId: string | null;
  onTypingStart: () => void;
  isHighlighted: boolean;
};
const TagPills: React.FC<TagPillsProps> = ({
  tag,
  editMode,
  reorderMode,
  deleteTag,
  isNewCategory,
  onReorder,
  uniqueId,
  onTypingStart,
  isHighlighted,
}) => {
  const styles = useStyles();

  const [tagName, setTagName] = useState<string>(tag.name);

  useEffect(() => {
    tag.name = tagName;
  }, [tagName]);

  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (isHighlighted) {
      setHighlight(true);
      setTimeout(() => setHighlight(false), 1000);
    }
  }, [isHighlighted]);

  const contentEditableRef = useRef<HTMLInputElement>(null);

  const handleOnInput = () => {
    if (contentEditableRef.current) {
      onTypingStart();
      const content = contentEditableRef.current.textContent;
      content && setTagName(content);
    }
  };

  useLayoutEffect(() => {
    if (contentEditableRef.current) {
      contentEditableRef.current.textContent = tag.name;
    }
  }, [tag]);

  const handleOnBlur = () => {
    //TODO: check why this doesn't work here but on Category does work.
    if (
      contentEditableRef.current &&
      contentEditableRef.current['textContent'] === ''
    ) {
      setTagName('Untitled');
    }
  };

  const reset = () => {
    handleOnBlur();
  };
  const commit = () => {
    handleOnBlur();
  };

  const onKeyDown = (e) => {
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
    <div
      className={
        tag &&
        cn(
          styles.tagPillSize,
          styles.tagPill,
          (editMode || reorderMode) && styles.editPill,
          highlight && styles.highlightedTag
        )
      }
      style={{
        backgroundColor:
          tag && (editMode || reorderMode) ? 'transparent' : '#E5E5E5',
      }}
    >
      {reorderMode && (
        <Button
          className={cn(styles.deleteIcon)}
          onClick={() => onReorder(tag, 'right')}
        >
          <img key="MoveLeftTagSettings" src="/icons/settings/Move-left.svg" />
        </Button>
      )}

      <div
        id={uniqueId || tag.key}
        className={cn(styles.tagInputPill)}
        readOnly={!editMode && !isNewCategory}
        onInput={handleOnInput}
        onKeyDown={onKeyDown}
        onBlur={handleOnBlur}
        contentEditable={
          !editMode && !isNewCategory ? 'false' : 'plaintext-only'
        }
        suppressContentEditableWarning={true}
        ref={contentEditableRef}
      />

      {editMode && (
        <div className={cn(styles.deleteIcon)} onClick={deleteTag}>
          <img key="DeleteTagSettings" src="/icons/settings/Close.svg" />
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
};

//==================================================================================TableRowCategory=========================================================================
type TableRowCategoryProps = {
  graphManager: GraphManager;
  categoryVertex: VertexManager<Tag>;
  workspaceManagerKey: string;
  isNew: boolean;
};
const TableRowCategory: React.FC<TableRowCategoryProps> = ({
  graphManager,
  categoryVertex,
  workspaceManagerKey,
  isNew,
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
  const [newTagId, setNewTagId] = useState<string | null>(null);
  const [canCreateNewTag, setCanCreateNewTag] = useState(true);
  const [highlightTag, setHighlightTag] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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

  const handleTypingStart = () => {
    setCanCreateNewTag(true);
  };

  const handleOnCreateTag = () => {
    if (!canCreateNewTag) {
      setHighlightTag(true);
      setTimeout(() => setHighlightTag(false), 1000);
      return;
    }
    const createdVertex = graphManager.createVertex<Tag>(SchemeNamespace.TAGS, {
      workspace: workspaceManagerKey,
      parentTag: category.key,
    });
    const uniqueIdForNewTag = `tag-${String(uniqueId())}`;
    setNewTagId(uniqueIdForNewTag);
    setNewTagVertex(createdVertex.manager);
    setCanCreateNewTag(false);
  };

  useEffect(() => {
    if (newTagId) {
      const newTagElement = document.getElementById(newTagId);
      if (newTagElement) {
        newTagElement.focus();
      }
      setNewTagId(null);
    }
  }, [newTagId]);

  const handleOnDeleteCategory = () => {
    category.isDeleted = 1;
    setShowConfirmation(false);
  };
  const handleCancelClick = () => {
    setShowConfirmation(false);
  };
  useEffect(() => {
    childTags.sort((a, b) => coreValueCompare(a.sortStamp, b.sortStamp));
    if (lastTagRef.current) {
      lastTagRef.current.focus();
    }
  }, [childTags]);

  const deleteTag = (tagKey: string) => {
    const tagToDelete = childTags.find((tag) => tag.key === tagKey);
    if (tagToDelete) {
      tagToDelete.isDeleted = 1;
    }
  };

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
      <div className={isOpen ? styles.itemMenuOpen : styles.itemMenu}>
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
                uniqueId={tag.key === newTagVertex?.key ? newTagId : null}
                editMode={isEditMode}
                reorderMode={isReorderMode}
                deleteTag={() => deleteTag(tag.key)}
                isNewCategory={false}
                onReorder={handleReorderTag}
                onTypingStart={handleTypingStart}
                isHighlighted={highlightTag && index === 0}
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
              text="Delete"
              iconWidth="16px"
              iconHeight="16px"
              onClick={() => {
                setShowConfirmation(true);
              }}
            />
          </Menu>
          {showConfirmation && (
            <ConfirmationDialog
              className={styles.popup}
              approveButtonText="Delete"
              titleText="Delete category?"
              handleApproveClick={() => {
                handleOnDeleteCategory();
                setShowConfirmation(false);
              }}
              handleCancelClick={() => setShowConfirmation(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

//=====================================================================================TagsTable======================================================================================
type TagsTableProps = {
  workspaceManager: VertexManager<Workspace>;
  graphManager: GraphManager;
};

export const TagsTable: React.FC<TagsTableProps> = ({
  workspaceManager,
  graphManager,
}) => {
  const styles = useStyles();
  const categoriesQuery: VertexManager<Tag>[] = useSharedQuery(
    'parentTagsByWorkspace'
  ).group(workspaceManager);
  const [newCategoryVertex, setNewCategoryVertex] = useState<
    VertexManager<Tag> | undefined
  >(undefined);

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
      <Button
        className={cn(styles.newCategory, styles.rowLayout)}
        onClick={handleNewCategory}
      >
        <div className={cn(styles.addButton)}>
          <img key="AddTagSettings" src="/icons/settings/Add.svg" />
          <div className={cn(styles.newCategoryText)}>New Category</div>
        </div>
      </Button>
      <div className={cn(styles.scrollTable)}>
        {categoriesQuery.map((category, index) => (
          <TableRowCategory
            key={`${category.key}-${index}`}
            categoryVertex={category}
            isNew={newCategoryVertex === category}
            graphManager={graphManager}
            workspaceManagerKey={workspaceManager.key}
          />
        ))}
      </div>
    </div>
  );
};
