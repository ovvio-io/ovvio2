import React, { CSSProperties, ChangeEvent, useEffect, useRef } from 'react';
import { User } from '../cfds/client/graph/vertices/user.ts';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { IconSearch } from '../styles/components/new-icons/icon-search.tsx';
import { Workspace } from '../cfds/client/graph/vertices/index.ts';
import { styleguide } from '../styles/styleguide.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';

const useStyles = makeStyles(() => ({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  regularStyle: {
    padding: '12px 16px',
    marginBottom: 1,
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
    borderRadius: '2px',
    backgroundColor: 'white',
  },
  pickerStyle: {
    // padding: '0px 0px 0px 8px',
    // gap: '8px',
    // height: 4 * styleguide.gridbase,
    // backgroundColor: theme.secondary.s0,
    // borderBottom: `2px solid var(--Secondary-S2, #${theme.secondary.s2})`,
    display: 'flex',
    padding: '0px 0px 0px 8px',
    marginBottom: 'none',
    alignItems: 'center',
    boxShadow: 'none',
    width: 'none',
    height: '32px',
    borderRadius: 'none',
    backgroundColor: '#FFFBF5',
    justifyContent: 'flex-start',
    cursor: 'default',
    borderBottom: '2px solid var(--Secondary-S2, #F5ECDC)',
  },
  baseTextStyle: {
    fontFamily: 'Poppins',
    fontSize: '13px',
    fontWeight: 400,
    lineHeight: '19.5px',
    letterSpacing: '0.075px',
    textAlign: 'left',
    border: 'none',
    outline: 'none',
  },
  regularTextStyle: {
    backgroundColor: 'white',
  },
  pickerTextStyle: {
    backgroundColor: theme.secondary.s0,
  },
}));

export type SearchBarProps = {
  users?: User[];
  workspaces?: Workspace[];
  searchTerm: string;
  setSearchTerm: (user: string) => void;
  isPicker?: boolean;
  isSearching: boolean;
  className?: string;
  width?: number;
};

export const SearchBar: React.FC<SearchBarProps> = ({
  users,
  workspaces,
  searchTerm,
  setSearchTerm,
  isPicker,
  isSearching,
  className,
  width,
}) => {
  const styles = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearching && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearching]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const containerStyle: CSSProperties = {};
  const inputStyle: CSSProperties = {};
  if (width) {
    containerStyle.width = `${width}px`;
    inputStyle.width = `${width - 28}px`;
  }

  return (
    <div
      className={cn(
        styles.base,
        isPicker ? styles.pickerStyle : styles.regularStyle
      )}
      style={containerStyle}
    >
      <IconSearch />
      <input
        ref={inputRef}
        type="text"
        placeholder={users ? 'Search member' : 'Search workspace'}
        value={searchTerm}
        onChange={handleSearchChange}
        className={cn(
          styles.baseTextStyle,
          isPicker ? styles.pickerTextStyle : styles.regularTextStyle,
          className
        )}
        style={inputStyle}
      />
    </div>
  );
};
