import React, {
  CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { layout } from '../../../../../styles/layout.ts';
import { Button } from '../../../../../styles/components/buttons.tsx';
import Menu, {
  MenuAction,
  MenuItem,
} from '../../../../../styles/components/menu.tsx';
import { IconOpen } from '../../../../../styles/components/new-icons/icon-open.tsx';
import { RefObject } from 'https://esm.sh/v96/@types/react@18.2.15/index.js';
import {
  Tag,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import {
  usePartialVertex,
  usePartialVertices,
  useVertex,
  useVertices,
} from '../../../core/cfds/react/vertex.ts';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { QueryResults } from '../../../../../cfds/client/graph/query.ts';
import { useGraphManager } from '../../../core/cfds/react/graph.tsx';
import { SchemeNamespace } from '../../../../../cfds/base/scheme-types.ts';
import { LogoText } from '../../../../../styles/components/logo.tsx';
import { GraphManager } from '../../../../../cfds/client/graph/graph-manager.ts';
import IconEdit from '../../../../../styles/components/icons/IconEdit.tsx';
import { IconCompose } from '../../../../../styles/components/new-icons/icon-compose.tsx';

const useStyles = makeStyles(() => ({
  /* Container for the entire table. Positioned relative to its normal position and given a top margin. */
  tableContainer: {
    position: 'relative',
    top: '64px',
    width: '100%', // Adjust as necessary for overall container width
  },

  /* Style for each row's layout including shadow, border, and background settings. */
  rowLayout: {
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)', // Shadow for depth
    borderRadius: '2px', // Rounded corners
    borderColor: '#E0EEF4', // Border color
    backgroundColor: '#FFF', // Background color
    boxSizing: 'border-box', // Box sizing to include padding and borders in width/height
    marginBottom: '1px', // Space between rows
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
    flexDirection: 'column', // Items are laid out vertically
    justifyContent: 'flex-start', // Aligns items to the start
  },

  categoryPill: {
    display: 'flex',
    position: 'absolute',
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
    minWidth: '30px',
  },
  editPill: {
    borderRadius: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderColor: '#CCCCCC',
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
    color: 'var(--tag-color)', // Color of the text
    marginRight: styleguide.gridbase, // Margin to the right
    display: 'flex',
    padding: '2px 4px 2px 8px', // Padding within the tag
  },

  moreButtonColumn: {
    position: 'absolute',
    right: '8px',
  },

  //===========
  input: {
    fontSize: '10px',
    lineHeight: '20px',
    outline: 'none',
    border: 'none',
    padding: '0px 8px 0px 8px',
    backgroundColor: 'transparent',
    minWidth: '20px', // Set a reasonable minimum width
    width: 'auto', // Allow width to adjust automatically
  },
  newCategory: {
    display: 'flex',
    width: ' 154px',
    height: '44px',
    padding: '12px 16px',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
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
    maxHeight: '100px',
    overflowY: 'scroll',
    overflowX: 'visible',
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
  name: string;
  setName: (name: string) => void;
  onBlur: () => void;
  editMode: boolean;
}
const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  ({ name, setName, onBlur, editMode }, ref) => {
    const styles = useStyles();
    const [value, setValue] = useState<string>(name);

    const [inputWidth, setInputWidth] = useState<string>(
      (name.length + 1) * 5 + 'px'
    );

    useEffect(() => {
      setValue(name);
      setInputWidth((name.length + 1) * 5 + 'px');
    }, [name]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      setInputWidth(e.target.value.length * 2 + 'px');
    };

    const commit = () => {
      setName(value);
      onBlur();
    };

    const reset = () => {
      setValue(name);
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
        className={cn(styles.input)}
        type="text"
        ref={ref as React.RefObject<HTMLInputElement>}
        value={value}
        onChange={onChange}
        onBlur={blur}
        onKeyDown={onKeyDown}
        readOnly={!editMode}
        style={{ width: inputWidth }}
      />
    );
  }
);

//==============================================================================TagInput======================================
interface CategoryInputProps {
  name: string;
  setName: (name: string) => void;
  onBlur: () => void;
  editMode: boolean;
}

const CategoryInput = React.forwardRef<HTMLInputElement, CategoryInputProps>(
  ({ name, setName, onBlur, editMode }, ref) => {
    const styles = useStyles();
    const [value, setValue] = useState<string>(name);

    useEffect(() => {
      setValue(name);
      if (ref && 'current' in ref && ref.current) {
        ref.current.style.width = (name.length + 2) * 10 + 'px';
      }
    }, [name, ref]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      if (ref && 'current' in ref && ref.current) {
        ref.current.style.width = (e.target.value.length + 1) * 7 + 'px';
      }
    };

    const commit = () => {
      setName(value);
      onBlur();
    };

    const reset = () => {
      setValue(name);
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
      />
    );
  }
);

//=========================================================================================CategoryPill===========================

type CategoryPillProps = {
  category: string;
  editMode: boolean;
  isNewCategory: boolean;
};

const CategoryPill: React.FC<CategoryPillProps> = ({
  category,
  editMode,
  isNewCategory,
}) => {
  const styles = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNewCategory || (editMode && inputRef.current)) {
      inputRef.current?.focus();
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
        name={category}
        setName={() => {}}
        ref={inputRef}
        onBlur={onBlur}
        editMode={editMode || isNewCategory}
      />
    </div>
  );
};

//=========================================================================================TagPills===========================

type TagPillsProps = {
  tag: string;
  editMode: boolean;
  deleteTag: () => void;
  isNewCategory: boolean;
};

const TagPills = React.forwardRef<HTMLInputElement, TagPillsProps>(
  ({ tag, editMode, deleteTag, isNewCategory }, ref) => {
    const styles = useStyles();

    const onBlur = () => {};

    return (
      <div
        className={cn(
          styles.tagPillSize,
          styles.tagPill,
          editMode && styles.editPill
        )}
        style={{ backgroundColor: editMode ? 'transparent' : '#E5E5E5' }}
      >
        <TagInput
          name={tag}
          setName={() => {}}
          ref={ref}
          onBlur={onBlur}
          editMode={editMode || isNewCategory}
        />
        {editMode && (
          <div className={cn(styles.deleteIcon)} onClick={deleteTag}>
            <img key="DeleteTagSettings" src="/icons/settings/Close-big.svg" />
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
  isNewCategory: boolean;
  workspaceManagerKey: string;
  setIsNewCategory: (b: boolean) => void;
};
const TableRowCategory: React.FC<TableRowCategoryProps> = ({
  graphManager,
  categoryVertex,
  isNewCategory,
  setIsNewCategory,
  workspaceManagerKey,
}) => {
  const category = useVertex(categoryVertex) as Tag;
  // const { childTags } = usePartialVertex(category, ['childTags']);
  const { childTags } = category;
  const styles = useStyles();
  const rowRef = useRef<HTMLDivElement>(null);
  const lastTagRef = useRef<HTMLInputElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [newTagVertex, setNewTagVertex] = useState<VertexManager<Tag> | null>(
    null
  );

  const handleOnCreateTag = async () => {
    try {
      const createdVertex = await graphManager.createVertex<Tag>(
        SchemeNamespace.TAGS,
        {
          workspace: workspaceManagerKey,
          name: '',
          parentTag: category.key,
        }
      );
      // Convert the Vertex to a VertexManager
      const vertexManager = graphManager.getVertexManager(createdVertex);
      setNewTagVertex(vertexManager);
    } catch (error) {
      console.error('Error creating new category vertex:', error);
    }
  };
  const handleOnDeleteCategory = async () => {
    try {
      category.isDeleted = 1;
    } catch (error) {
      console.error('Error deleting category:', error);
      setIsEditMode(false);
    }
  };

  useEffect(() => {
    if (lastTagRef.current) {
      lastTagRef.current.focus();
    }
  }, [childTags]);

  const deleteTag = (tagToDelete: Tag) => {
    tagToDelete.isDeleted = 1;
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const closeEditMode = (): void => {
    setIsEditMode(false);
    // setIsNewCategory(false); // fix this. the ref is now on the new row.
  };

  useOutsideClick(rowRef, closeEditMode);

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
  interface ImageIconProps {
    width?: string;
    height?: string;
    src: string;
    alt?: string;
  }
  const ImageIcon: React.FC<ImageIconProps> = ({ width, height, src, alt }) => {
    return <img src={src} alt={alt || 'icon'} width={width} height={height} />;
  };

  return (
    <div ref={rowRef} className={cn(styles.row, styles.rowLayout)}>
      <div className={cn(styles.rowContent)}>
        <div className={cn(styles.CategoryColumnStyle)}>
          {isNewCategory ? (
            <CategoryPill
              category={''}
              editMode={isNewCategory}
              isNewCategory={isNewCategory}
            />
          ) : (
            <CategoryPill
              category={category.name}
              editMode={isEditMode}
              isNewCategory={isNewCategory}
            />
          )}
        </div>
        <div className={cn(styles.TagsColumnStyle)}>
          {(isEditMode || isNewCategory) && (
            <Button
              className={cn(styles.addButton)}
              onClick={handleOnCreateTag}
            >
              <img key="AddTagSettings" src="/icons/settings/Add.svg" />
            </Button>
          )}
          {!isNewCategory &&
            childTags.map((tag: Tag, index) => (
              <TagPills
                key={`${tag}-${index}`}
                tag={tag.name}
                editMode={isEditMode}
                deleteTag={() => deleteTag(tag)}
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
  const [newCategory, setNewCategory] = useState<boolean>();
  const categoriesQuery = useSharedQuery('parentTagsByWorkspace').group(
    workspaceManager
  );

  // categoriesQuery.sort((a, b) => {
  //   if (...) {
  //     return ...;
  //   }
  //   return coreValueCompare(a, b);
  // })

  const [newCategoryVertex, setNewCategoryVertex] =
    useState<VertexManager<Tag> | null>(null);

  const handleNewCategory = async () => {
    setNewCategory(true);
    try {
      const createdVertex = await graphManager.createVertex<Tag>(
        SchemeNamespace.TAGS,
        {
          workspace: workspaceManager.key,
        }
      );
      // Convert the Vertex to a VertexManager
      const vertexManager = graphManager.getVertexManager<Tag>(createdVertex);
      setNewCategoryVertex(vertexManager);
    } catch (error) {
      console.error('Error creating new category vertex:', error);
      setNewCategory(false);
    }
  };

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

      {newCategory && newCategoryVertex && (
        <TableRowCategory
          key={`${newCategoryVertex}`}
          categoryVertex={newCategoryVertex}
          isNewCategory={true}
          setIsNewCategory={setNewCategory}
          graphManager={graphManager}
          workspaceManagerKey={workspaceManager.key}
        />
      )}
      {categoriesQuery.map((category, index) => (
        <TableRowCategory
          key={`${category.key}-${index}`}
          categoryVertex={category}
          isNewCategory={false}
          setIsNewCategory={setNewCategory}
          graphManager={graphManager}
          workspaceManagerKey={workspaceManager.key}
        />
      ))}
    </div>
  );
};
