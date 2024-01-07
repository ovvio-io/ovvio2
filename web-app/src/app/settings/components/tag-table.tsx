import React, {
  CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { User } from '../../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import { IconMore } from '../../../../../styles/components/new-icons/icon-more.tsx';
import { SearchBar } from '../../../../../components/search-bar.tsx';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import { useVertices } from '../../../core/cfds/react/vertex.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { layout } from '../../../../../styles/layout.ts';
import { Button } from '../../../../../styles/components/buttons.tsx';
import Menu, {
  MenuAction,
  MenuItem,
} from '../../../../../styles/components/menu.tsx';
import { IconOpen } from '../../../../../styles/components/new-icons/icon-open.tsx';
import { RefObject } from 'https://esm.sh/v96/@types/react@18.2.15/index.js';

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
    padding: '2px 4px 2px 8px', // Padding within the tag
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
    padding: 0,
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
    position: 'relative',
    left: '12px',
  },

  //===========
  input: {
    fontSize: '10px',
    lineHeight: '20px',
    outline: 'none',
    border: 'none',
    padding: 0,
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
  setName: React.Dispatch<React.SetStateAction<string>>;
  onBlur: () => void;
  editMode: boolean;
}

const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  ({ name, setName, onBlur, editMode }, ref) => {
    const styles = useStyles();
    const [value, setValue] = useState<string>(name);

    useEffect(() => {
      setValue(name);
      if (ref && 'current' in ref && ref.current) {
        ref.current.style.width = (name.length + 1) * 9 + 'px';
      }
    }, [name, ref]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      if (ref && 'current' in ref && ref.current) {
        ref.current.style.width = e.target.value.length * 6 + 'px';
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
        className={cn(styles.input)}
        type="text"
        ref={ref as React.RefObject<HTMLInputElement>} // Explicitly specify the ref type
        value={value}
        onChange={onChange}
        onBlur={blur}
        onKeyDown={onKeyDown}
        readOnly={!editMode}
      />
    );
  }
);

//==============================================================================TagInput======================================
interface CategoryInputProps {
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
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
        ref.current.style.width = (name.length + 1) * 7 + 'px';
      }
    }, [name, ref]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      if (ref && 'current' in ref && ref.current) {
        ref.current.style.width = e.target.value.length * 6 + 'px';
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

type CategoryPillProps = { category: string; editMode: boolean };

const CategoryPill: React.FC<CategoryPillProps> = ({ category, editMode }) => {
  const styles = useStyles();
  const inputRef = useRef<any>();
  const [isEditing, setIsEditing] = useState(false);

  const onClick = () => {
    setIsEditing(true);
    inputRef.current.focus();

    if (inputRef.current.setSelectionRange) {
      inputRef.current.setSelectionRange(0, category.length);
    }
    window.requestAnimationFrame(() => {
      inputRef.current.focus();
    });
  };
  const onBlur = () => {
    setIsEditing(false);
  };

  return (
    <div
      className={cn(styles.categoryPill, editMode && styles.editPill)}
      onClick={() => {
        onClick;
      }}
    >
      <CategoryInput
        name={category}
        setName={function (value: React.SetStateAction<string>): void {
          throw new Error('Function not implemented.');
        }}
        ref={inputRef}
        onBlur={onBlur}
        editMode={editMode}
      />
    </div>
  );
};

//=========================================================================================TagPills===========================

type TagPillsProps = { tag: string; editMode: boolean };

const TagPills: React.FC<TagPillsProps> = ({ tag, editMode }) => {
  const styles = useStyles();
  const inputRef = useRef<any>();
  const [isEditing, setIsEditing] = useState(false);

  const onClick = () => {
    setIsEditing(true);
    inputRef.current.focus();

    if (inputRef.current.setSelectionRange) {
      inputRef.current.setSelectionRange(0, tag.length);
    }
    window.requestAnimationFrame(() => {
      inputRef.current.focus();
    });
  };
  const onBlur = () => {
    setIsEditing(false);
  };
  return (
    <div
      className={cn(
        styles.tagPillSize,
        styles.tagPill,
        editMode && styles.editPill
      )}
      style={{ backgroundColor: editMode ? 'transparent' : '#E5E5E5' }}
      onClick={() => {
        onClick;
      }}
    >
      <TagInput
        name={tag}
        setName={function (value: React.SetStateAction<string>): void {
          throw new Error('Function not implemented.');
        }}
        ref={inputRef}
        onBlur={onBlur}
        editMode={editMode}
      />
      {editMode && (
        <div className={cn(styles.deleteIcon)} onClick={() => {}}>
          <img key="DeleteTagSettings" src="/icons/settings/Close-big.svg" />
        </div>
      )}
    </div>
  );
};

const onCreateTag = () => {
  const newTags = {};
};

//==================================================================================TableRowCategory==================================
type TableRowCategoryProps = {
  category: string;
  addNewCategory: boolean;
  onRowSelect: (user: string) => void;
};
const TableRowCategory: React.FC<TableRowCategoryProps> = ({
  category,
  addNewCategory,
  onRowSelect,
}) => {
  const styles = useStyles();
  const [isRowHovered, setIsRowHovered] = useState(false);
  const tags: string[] = [
    'high',
    'low',
    'medium',
    '1st',
    '2nd',
    '3th',
    '4th',
    '5th',
  ];
  const handleMouseEnter = () => {
    setIsRowHovered(true);
  };
  const handleMouseLeave = () => {
    setIsRowHovered(false);
  };
  const [isEditMode, setIsEditMode] = useState(false);

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };
  const rowRef = useRef<HTMLDivElement>(null);

  const closeEditMode = (): void => {
    setIsEditMode(false);
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
    <div
      ref={rowRef}
      className={cn(styles.row, styles.rowLayout)}
      onClick={() => {
        category && onRowSelect(category);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={cn(styles.rowContent)}>
        <div className={cn(styles.CategoryColumnStyle)}>
          <CategoryPill category={category} editMode={isEditMode} />
        </div>
        <div className={cn(styles.TagsColumnStyle)}>
          {isEditMode && (
            <Button className={cn(styles.addButton)} onClick={onCreateTag}>
              <img key="AddTagSettings" src="/icons/settings/Add.svg" />
            </Button>
          )}
          {tags.map((tag: string, index) => (
            <TagPills key={tag + index} tag={tag} editMode={isEditMode} />
          ))}
        </div>
        <div className={cn(styles.moreButtonColumn)}>
          <Menu
            renderButton={renderButton}
            position="right"
            align="center"
            direction="out"
          >
            <MenuAction
              IconComponent={IconOpen}
              text="Edit"
              onClick={toggleEditMode}
            ></MenuAction>
            <MenuAction IconComponent={IconOpen} text="Reorder"></MenuAction>{' '}
            <MenuAction
              IconComponent={(props: ImageIconProps) => (
                <ImageIcon
                  {...props}
                  src="/icons/settings/Delete.svg"
                  alt="Delete"
                />
              )}
              text="Delete"
            ></MenuAction>
          </Menu>
        </div>
      </div>
    </div>
  );
};

//=====================================================================================TagsTable===============================
type TagsTableProps = {
  setStep?: (step: number) => void;
  onClose?: () => void;
};

export const TagsTable: React.FC<TagsTableProps> = ({ setStep, onClose }) => {
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];
  const [newCategory, setNewCategory] = useState<boolean>();
  const [categories, setCategories] = useState<boolean>();

  const styles = useStyles();
  const handleNewCategory = () => {
    setNewCategory(true);
  };

  const onRowSelect = () => {};
  const tempCategories: string[] = ['Effort', 'Priority', 'Phase', 'Mil'];

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
      {newCategory && (
        <TableRowCategory
          category={''}
          addNewCategory={true}
          onRowSelect={() => {}}
        />
      )}
      {tempCategories.map((category: string, index) => (
        <TableRowCategory
          key={category + index}
          category={category}
          onRowSelect={onRowSelect}
          addNewCategory={false}
        />
      ))}
    </div>
  );
};
