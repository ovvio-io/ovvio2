import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { User } from '../cfds/client/graph/vertices/user.ts';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { IconSearch } from '../styles/components/new-icons/icon-search.tsx';
import { Workspace } from '../cfds/client/graph/vertices/index.ts';

//TODO: change to "SearchBar"
export type SearchBarProps = {
  users?: User[];
  workspaces?: Workspace[];
  searchTerm: string;
  setSearchTerm: (user: string) => void;
  isPicker?: boolean;
  isSearching: boolean;
};

export const SearchBar: React.FC<SearchBarProps> = ({
  users,
  workspaces,
  searchTerm,
  setSearchTerm,
  isPicker,
  isSearching,
}) => {
  const useStyles = makeStyles(() => ({
    searchRowStyle: {
      display: 'flex',
      padding: isPicker ? '0px 0px 0px 8px' : '12px 16px',
      marginBottom: isPicker ? 'none' : '1px',
      alignItems: 'center',
      gap: isPicker ? '8px' : 'none',
      boxShadow: isPicker ? 'none' : '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
      width: isPicker ? 'none' : '772px',
      height: isPicker ? '32px' : 'none',
      borderRadius: isPicker ? 'none' : '2px',
      backgroundColor: isPicker ? '#FFFBF5' : '#FFF',
      justifyContent: 'flex-start',
      cursor: 'default',
      borderBottom: isPicker
        ? '2px solid var(--Secondary-S2, #F5ECDC)'
        : 'none',
    },
    InputTextStyle: {
      flexGrow: 1,
      border: 'none',
      outline: 'none',
      width: '100%',
      fontSize: '13px',
      letterSpacing: '0.075px',
      backgroundColor: isPicker ? '#FFFBF5' : '#FFF',
    },
  }));
  const styles = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);

  // useEffect(() => {
  //   console.log('Input Ref:', inputRef.current, 'isSearching: ', isSearching); // Debugging line to check if the ref is attached
  //   if (isSearching && inputRef.current) {
  //     inputRef.current.focus();
  //   }
  // }, [isSearching]);

  useEffect(() => {
    if (isSearching && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearching]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className={cn(styles.searchRowStyle)}>
      <div style={{ marginRight: '4px' }}>
        <IconSearch />
      </div>
      <input
        ref={inputRef}
        type="text"
        placeholder={users ? 'Search member' : 'Search workspace'}
        value={searchTerm}
        onChange={handleSearchChange}
        className={styles.InputTextStyle}
      />
    </div>
  );
};
