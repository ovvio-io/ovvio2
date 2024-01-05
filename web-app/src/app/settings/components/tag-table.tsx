import React, {
  CSSProperties,
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

const useStyles = makeStyles(() => ({
  tableContainer: {
    position: 'relative',
    top: '64px',
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
  rowLayout: {
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
    borderRadius: '2px',
    borderColor: '#E0EEF4',
    backgroundColor: '#FFF',
    boxSizing: 'border-box',
    marginBottom: '1px',
  },
  row: {
    display: 'flex',
    position: 'relative',
    alignItems: 'center',
    maxWidth: '670px',
    ':hover': {
      backgroundColor: '#FBF6EF',
      itemMenu: {
        opacity: 1,
      },
    },
  },
  rowContent: {
    display: 'flex',
    position: 'relative',
    justifyContent: 'center',
    maxWidth: '510px',
    gap: '4px',
    padding: ' 18px 28px 17px 16px',
  },
  pillRoot: {
    position: 'relative',
  },
  CategoryColumnStyle: {
    display: 'flex',
    width: '200px',
    height: '20px',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    color: theme.colors.text,
    fontSize: '14px',
    lineHeight: '21px',
    letterSpacing: '0.0.87px',
    fontWeight: '600',
  },
  TagsColumnStyle: {
    display: 'flex',
    height: '17px',
    maxWidth: '510px',
    alignItems: 'center',
    alignContent: 'center',
    flexFlow: 'column wrap',
    justifyContent: 'center',
    gap: '4px',
  },
  moreButtonColumn: {
    position: 'relative',
    // left: '220px',
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
  tagPill: {
    color: 'var(--tag-color)',
    backgroundColor: '#E5E5E5',
    marginRight: styleguide.gridbase,
    display: 'flex,',
    padding: '2px 4px 2px 8px',
  },
  input: {
    fontSize: '10px',
    lineHeight: '20px',
    outline: 'none',
    border: 'none',
    padding: 0,
    backgroundColor: '#E5E5E5',
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
  deleteIcon: {
    width: styleguide.gridbase * 2,
    height: styleguide.gridbase * 2,
    cursor: 'pointer',
  },
}));
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
  const onChange = (e) => {
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
  const blur = (e) => {
    commit();
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
type CategoryTitleProps = {};
const CategoryTitle: React.FC<CategoryTitleProps> = ({}) => {};

type TagPillsProps = {};
const TagPills: React.FC<TagPillsProps> = ({}) => {
  const styles = useStyles();

  return (
    <div className={cn(styles.pillRoot)}>
      <div className={cn(styles.pillSize, styles.tagPill)} onClick={() => {}}>
        <TagInput
          name={'TAG INPUT'}
          setName={function (value: React.SetStateAction<string>): void {
            throw new Error('Function not implemented.');
          }}
          onBlur={function (): void {
            throw new Error('Function not implemented.');
          }}
        />

        <span className={cn(styles.input)}>Tag</span>
        <div className={cn(styles.deleteIcon)}>
          <img key="DeleteTagSettings" src="/icons/settings/Close-big.svg" />
        </div>
      </div>
    </div>
  );
};

const onCreateTag = () => {
  const newTags = {};
};

type TableRowCategoryProps = {
  user?: User; // change later to category
  addNewCategory: boolean;
  onRowSelect: (user: string) => void;
};
const TableRowCategory: React.FC<TableRowCategoryProps> = ({
  user,
  addNewCategory,
  onRowSelect,
}) => {
  const styles = useStyles();
  const [isRowHovered, setIsRowHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsRowHovered(true);
  };
  const handleMouseLeave = () => {
    setIsRowHovered(false);
  };

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
      className={cn(styles.row, styles.rowLayout)}
      onClick={() => {
        user && onRowSelect(user.key);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={cn(styles.rowContent)}>
        <div className={cn(styles.CategoryColumnStyle)}>category pill</div>
        <div className={cn(styles.TagsColumnStyle)}>
          <Button className={cn(styles.addButton)} onClick={onCreateTag}>
            <img key="AddTagSettings" src="/icons/settings/Add.svg" />
          </Button>
          <TagPills />
        </div>
      </div>

      <Menu
        renderButton={renderButton}
        position="right"
        align="center"
        direction="out"
      >
        <MenuAction IconComponent={IconOpen} text="Edit"></MenuAction>
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
  );
};

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
        <TableRowCategory addNewCategory={true} onRowSelect={() => {}} />
      )}
      {users.map((user: User) => (
        <TableRowCategory
          key={user.key}
          user={user}
          onRowSelect={onRowSelect}
          addNewCategory={false}
        />
      ))}
    </div>
  );
};
