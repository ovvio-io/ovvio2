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

type CategoryTitleProps = {};
const CategoryTitle: React.FC<CategoryTitleProps> = ({}) => {};

type TagPillsProps = {};
const TagPills: React.FC<TagPillsProps> = ({}) => {};

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
  const useStyles = makeStyles(() => ({
    rowContainer: {
      position: 'relative',
      left: '-71px',
      width: '843px',
    },
    rowRight: {
      display: 'flex',
      position: 'relative',
      left: '71px',
      padding: '12px 16px',
      marginBottom: '1px',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
      width: '772px',
      borderRadius: '2px',
      backgroundColor: '#FFF',
    },
    hoverableRow: {
      ':hover': {
        backgroundColor: '#FBF6EF',
      },
    },
    rowLeft: {
      position: 'absolute',
      width: '71px',
      left: '40px',
      top: '9px',
    },
    rowLeftHover: {
      left: '0px',
    },
    selectHover: {
      position: 'absolute',
      width: '71px',
      left: '10px',
      top: '9px',
    },
    selectedRow: {
      backgroundColor: '#F5F9FB',
      border: '1px solid #CCE3ED',
      boxSizing: 'border-box',
      height: '44px',
      width: '805px',
      hover: 'none',
    },
    firstColumnStyle: {
      display: 'flex',
      width: '200px',
      height: '20px',
      flexDirection: 'column',
      justifyContent: 'center',
      color: theme.colors.text,
      fontSize: 13,
      lineHeight: '18px',
      letterSpacing: '0.0.75px',
      fontWeight: '400',
    },
    otherColumnStyle: {
      display: 'flex',
      height: '17px',
      maxWidth: '510px',
      alignItems: 'center',
      alignContent: 'center',
      gap: '4px',
      flexWrap: 'wrap',
    },
    moreIcon: {
      //place it left
    },
  }));

  const styles = useStyles();
  const [isRowHovered, setIsRowHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsRowHovered(true);
  };
  const handleMouseLeave = () => {
    setIsRowHovered(false);
  };

  return (
    <div
      className={cn(styles.rowContainer)}
      onClick={() => {
        user && onRowSelect(user.key);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!addNewCategory && user && (
        <div
          id={`setting/org/<${user.key}>`}
          className={cn(styles.rowRight, styles.hoverableRow)}
        >
          <div className={cn(styles.firstColumnStyle)}>{user.name}</div>
          <div className={cn(styles.otherColumnStyle)}>{user.email}</div>
          <IconMore />
        </div>
      )}
      {addNewCategory && (
        <div
          className={cn(
            styles.selectedRow,
            styles.rowRight,
            styles.hoverableRow
          )}
        >
          <div> aaaa </div>

          <div> bbbb </div>
        </div>
      )}
    </div>
  );
};

type TagsTableProps = {
  setStep?: (step: number) => void;
  onClose?: () => void;
};

export const TagsTable: React.FC<TagsTableProps> = ({ setStep, onClose }) => {
  const useStyles = makeStyles(() => ({
    tableContainer: {
      width: '843px',
      display: 'flex',
      position: 'relative',
    },
    tableContent: {
      flex: 1,
    },
    rowRight: {
      padding: '12px 23px 12px 16px',
      marginBottom: '1px',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
      width: '115px',
      borderRadius: '2px',
      backgroundColor: '#FFF',
    },
    firstColumnStyle: {
      display: 'flex',
      width: '200px',
      height: '20px',
      flexDirection: 'column',
      justifyContent: 'center',
      color: theme.colors.text,
      fontSize: 13,
      lineHeight: '18px',
      letterSpacing: '0.0.75px',
      fontWeight: '400',
    },
    selectedRow: {
      backgroundColor: '#F5F9FB',
      border: '1px solid #CCE3ED',
      boxSizing: 'border-box',
      height: '44px',
      width: '805px',
      hover: 'none',
    },
    hoverableRow: {
      ':hover': {
        backgroundColor: '#FBF6EF',
      },
    },
    addMemberButton: {
      display: 'flex',
      gap: '8px',
    },
    scrollTable: {
      maxHeight: '100px',
      overflowY: 'scroll',
      overflowX: 'visible',
    },
  }));
  const RectangleEdit: CSSProperties = {
    top: '0px',
    right: '0px',
    height: '64px',
    position: 'absolute',
    width: '100%',
    backgroundColor: '#3184dd',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  };
  const LeftRectangleEdit: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
  };
  const RightRectangleEdit: CSSProperties = {
    position: 'absolute',
    display: 'flex',
    left: '739px',
  };
  const closeIcon: CSSProperties = {
    paddingRight: styleguide.gridbase * 4,
    paddingLeft: styleguide.gridbase * 2,
  };
  const step0ContainerStyle: CSSProperties = {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    alignItems: 'center',
  };
  const HeaderContainerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '50px 0px 29px',
    maxWidth: '802px',
  };

  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];
  const [newCategory, setNewCategory] = useState<boolean>();
  const [categories, setCategories] = useState<boolean>();

  const styles = useStyles();
  const handleNewCategory = () => {
    setNewCategory(true);
  };

  const onSave = useCallback(() => {}, []);
  const onRowSelect = () => {};
  return (
    <div>
      <div
        className={cn(styles.rowRight, styles.hoverableRow)}
        onClick={handleNewCategory}
      >
        <div className={cn(styles.addMemberButton)}>
          <img key="AddTagSettings" src="/icons/settings/Add.svg" />
          <div className={cn(styles.firstColumnStyle)}>New Category</div>
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
