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

const useStyles = makeStyles(() => ({
  /* Container for the entire table. Positioned relative to its normal position and given a top margin. */
  tableContainer: {
    position: 'relative',
    top: '64px',
    width: '100%', // Adjust as necessary for overall container width
  },

  /* Style for each row's layout including shadow, border, and background settings. */
  rowLayout: {
    boxShadow: 'inset rgba(151, 132, 97, 0.25) 0px 2px 5px -2px', // Shadow for depth
    backgroundColor: 'var(--Monochrom-M0, #FFF)', // Using variable for background color
  },

  /* Styling for each row. It uses flexbox for layout. */
  row: {
    display: 'flex',
    minHeight: '56px',
    flexWrap: 'wrap', // Allows items to wrap to the next line
    padding: '0px 8px 0px 0px',
    position: 'relative',
    alignItems: 'center', // Centers items vertically
    width: '670px', // Fixed width for consistency
    borderBottom: '1px solid var(--Primary-P2, #E0EEF4)', // New border top style
    // borderTop: '1px solid var(--Primary-P2, #E0EEF4)', // New border top style

    ':hover': {
      backgroundColor: '#FBF6EF', // Background color on hover
      itemMenu: {
        opacity: 1, // Show item menu on hover
      },
    },
  },

  /* Styling for the content inside each row. */
  rowContent: {
    display: 'flex',
    position: 'relative',
    justifyContent: 'flex-start', // Aligns items to the start
    gap: '4px', // Space between elements
    padding: '18px 26px 17px 16px', // Padding inside the row
  },

  /* Styling for the category column. */
  CategoryColumnStyle: {
    display: 'flex',
    width: '160px', // Fixed width
    minWidth: '160px',
    flexDirection: 'column', // Items are laid out vertically
    justifyContent: 'center',
  },

  categoryPill: {
    display:
      'inline-flex' /* Align items in a row and allow dynamic resizing */,
    minWidth: '50px',
    // maxWidth: '100%',
    padding: '2px 4px 2px 8px', // Padding within the tag
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
    minWidth: '50px',
    width: 'auto',
  },
  editPill: {
    borderRadius: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderColor: '#CCCCCC',
    // position: 'absolute',
  },

  /* Styling for the tags column. */
  TagsColumnStyle: {
    display: 'flex',
    maxWidth: '510px', // Maximum width to leave space for moreButtonColumn
    alignItems: 'center', // Centers items vertically
    flexFlow: 'row wrap', // Allows items to be in a row and wrap
    gap: '4px', // Space between tags
    marginRight: '96px', // Space from the More Button Column
  },

  /* Base style for each pill in the tag column. */
  tagPillSize: {
    borderRadius: styleguide.gridbase * 2, // Rounded corners
    boxSizing: 'border-box',
    backgroundColor: '#E5E5E5', // Background color
    justifyContent: 'space-between', // Spaces items evenly
    alignItems: 'center', // Centers items vertically
  },

  /* Additional styling for each tag pill. */
  tagPill: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    color: 'var(--tag-color)', // Color of the text
    marginRight: styleguide.gridbase, // Margin to the right
    padding: '2px 4px 2px 8px', // Padding within the tag
  },

  moreButtonColumn: {
    position: 'absolute',
    right: '8px',
  },

  //===========
  tagInputPill: {
    fontSize: '10px',
    lineHeight: '14px',
    outline: 'none',
    border: 'none',
    padding: '0px 8px 0px 8px',
    backgroundColor: 'transparent',
    minWidth: '20px', // Set a reasonable minimum width
    width: 'auto', // Allow width to adjust automatically
    fontWeight: '400',
  },
  newCategory: {
    display: 'flex',
    width: ' 154px',
    height: '44px',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)', // Shadow for depth
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
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)', // Shadow for depth
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

//==============================================================================TagInput======================================
interface TagInputProps {
  tagName: string;
  setTagName: (name: string) => void;
  onBlur: () => void;
  editMode: boolean;
}
const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  ({ tagName, setTagName, onBlur, editMode }, ref) => {
    const styles = useStyles();
    const [value, setValue] = useState<string>(tagName);

    const [inputWidth, setInputWidth] = useState<string>(
      (tagName.length + 1) * 5 + 'px'
    );

    useEffect(() => {
      setValue(tagName);
      setInputWidth((tagName.length + 1) * 5 + 'px');
    }, [tagName]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      setInputWidth((tagName.length + e.target.value.length) * 2 + 'px');
    };

    const commit = () => {
      setTagName(value);
      onBlur();
    };

    const reset = () => {
      setValue(tagName);
      onBlur();
    };

    const blur = (e: React.FocusEvent<HTMLInputElement>) => {
      commit();
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        className={cn(styles.tagInputPill)}
        type="text"
        ref={ref as React.RefObject<HTMLInputElement>}
        value={value}
        onChange={onChange}
        onBlur={blur}
        onKeyDown={onKeyDown}
        readOnly={!editMode}
        placeholder="untitled"
        style={{ width: inputWidth }}
      />
    );
  }
);

//==============================================================================TagInput======================================
interface CategoryInputProps {
  categoryName: string;
  setCategoryName: (name: string) => void;
  onBlur: () => void;
  editMode: boolean;
}

const CategoryInput = React.forwardRef<HTMLInputElement, CategoryInputProps>(
  ({ categoryName, setCategoryName, onBlur, editMode }, ref) => {
    const styles = useStyles();
    const [value, setValue] = useState<string>(categoryName);

    const [inputWidth, setInputWidth] = useState<string>(
      (categoryName.length + 1) * 5 + 'px'
    );
    useEffect(() => {
      setValue(categoryName);
      setInputWidth((categoryName.length + 1) * 5 + 'px');
    }, [categoryName]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      setInputWidth((categoryName.length + e.target.value.length) * 2 + 'px');
    };

    const commit = () => {
      setCategoryName(value);
      onBlur();
    };

    const reset = () => {
      setValue(categoryName);
      onBlur();
    };

    const blur = (e: React.FocusEvent<HTMLInputElement>) => {
      commit();
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        className={cn(styles.categoryInputPill)}
        type="text"
        ref={ref as React.RefObject<HTMLInputElement>}
        value={value}
        onChange={onChange}
        onBlur={blur}
        onKeyDown={onKeyDown}
        readOnly={!editMode}
        placeholder="untitled"
        style={{ width: inputWidth }}
      />
    );
  }
);

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
  // const inputRef = useRef<HTMLInputElement>(null);
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

  const onBlur = () => {};

  const categoryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNewCategory && categoryInputRef.current) {
      categoryInputRef.current.focus();
    }
  }, [isNewCategory]);

  return (
    <div className={cn(styles.categoryPill, editMode && styles.editPill)}>
      <CategoryInput
        categoryName={categoryName}
        setCategoryName={setCategoryName}
        ref={inputRef}
        onBlur={onBlur}
        editMode={editMode || isNewCategory}
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

    const onBlur = () => {};

    useEffect(() => {
      tag.name = tagName;
    }, [tagName]);

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
        <TagInput
          tagName={tagName}
          setTagName={setTagName}
          ref={ref}
          onBlur={onBlur}
          editMode={editMode || isNewCategory}
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
