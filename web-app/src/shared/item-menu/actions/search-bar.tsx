import React, {
  CSSProperties,
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { Workspace } from '../../../../../cfds/client/graph/vertices/workspace.ts';
import { IconSearch } from '../../../../../styles/components/new-icons/icon-search.tsx';

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
    padding: '0px 0px 0px 8px',
    gap: '8px',
    height: 4 * styleguide.gridbase,
    // backgroundColor: theme.secondary.s0,
    // borderBottom: `2px solid var(--Secondary-S2, #${theme.secondary.s2})`,
  },
  baseTextStyle: {
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    letterSpacing: '0.075px',
  },
  regularTextStyle: {
    backgroundColor: 'white',
  },
  pickerTextStyle: {
    // backgroundColor: theme.secondary.s0,
  },
}));

export type SearchBarProps = {
  workspaces?: Workspace[];
  searchTerm: string;
  setSearchTerm: (user: string) => void;
  isPicker?: boolean;
  isSearching: boolean;
  className?: string;
  width?: number;
};

export const SearchBar: React.FC<SearchBarProps> = ({
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
      <div style={{ marginRight: '4px' }}>
        <IconSearch />
      </div>
      <input
        ref={inputRef}
        type="text"
        placeholder={'Search workspace'}
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
