import React, { useEffect, useRef, useState } from 'react';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { LineSeparator, useMenuContext } from '../styles/components/menu.tsx';

const useStyles = makeStyles(() => ({
  tableContainer: {
    width: '103px',
    maxHeight: '242px',
  },
  tableContent: {
    width: '100%',
    overflowY: 'auto',
    overflowX: 'clip',
    flexDirection: 'column',
  },
  hoverableRow: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#FBF6EF',
    },
  },
  row: {
    paddingLeft: '8px',
    alignItems: 'center',
    width: '100%',
    height: '32px',
    minHeight: '32px',
    display: 'flex',
    fontSize: 13,
    lineHeight: '19.5px',
    fontFamily: 'poppins',
    fontWeight: '400',
    borderBottom: '2px solid var(--Secondary-S2, #F5ECDC)',
  },
  inputRow: {
    width: '100%',
    display: 'flex',
    padding: '0px 0px 0px 8px',
    gap: '8px',
    marginBottom: 'none',
    alignItems: 'center',
    boxShadow: 'none',
    height: '32px',
    borderRadius: 'none',
    backgroundColor: '#FFFBF5',
    borderBottom: '2px solid var(--Secondary-S2, #F5ECDC)',
  },
  InputTextStyle: {
    fontFamily: 'poppins',
    lineHeight: '19.5px',
    width: '40px',
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    letterSpacing: '0.075px',
    backgroundColor: 'inherit',
  },
  iconContainer: {
    display: 'flex',
  },
  minusIcon: {
    marginTop: 2,
  },
  selectedItem: {
    backgroundColor: '#FBF6EF',
  },
}));

type TimeTrackPickerProps = {
  onRowSelect: (time: string) => void;
  onAdd?: (time: string) => void;
  onSubtract?: (time: string) => void;
  closeAfterClick?: boolean;
};

export default function TimeTrackPicker({
  onRowSelect,
  onAdd,
  onSubtract,
  closeAfterClick,
}: TimeTrackPickerProps) {
  const styles = useStyles();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuCtx = useMenuContext();
  const componentRef = useRef<HTMLDivElement>(null);
  const [timeAdd, setTimeAdd] = useState('00:00');
  const [timeSubtract, setTimeSubtract] = useState('00:00');
  const inputAddRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        componentRef.current &&
        !componentRef.current.contains(event.target as Node)
      ) {
        menuCtx.close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuCtx]);

  useEffect(() => {
    if (inputAddRef.current) {
      inputAddRef.current.focus();
    }
  }, []);

  const handleAddTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTimeAdd(event.target.value);
  };

  const handleSubtractTimeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setTimeSubtract(event.target.value);
  };

  //   const handleRowClick = (
  //     tag: Tag,
  //     event: React.MouseEvent<HTMLDivElement, MouseEvent>
  //   ) => {
  //     event.stopPropagation();
  //     onRowSelect(tag);
  //     if (closeAfterClick) menuCtx.close();
  //   };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'Escape':
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        break;
      default:
        return;
    }
  };

  const timeOptions = ['00:15', '00:30', '00:45', '01:00'];

  return (
    <div ref={componentRef} className={cn(styles.tableContainer)}>
      <div className={cn(styles.tableContent)} onKeyDown={onKeyDown}>
        <>
          <div
            className={cn(styles.inputRow, styles.hoverableRow)}
            onClick={() => onAdd && onAdd(timeAdd)}>
            <div className={cn(styles.iconContainer)}>
              <img
                className={cn(styles.minusIcon)}
                src="/icons/design-system/timeTracking/Plus-big.svg"
                onClick={() => {
                  console.log('add clicked');
                }}
              />
            </div>
            <input
              ref={inputAddRef}
              type="text"
              onChange={handleAddTimeChange}
              className={styles.InputTextStyle}
              pattern="[0-9]{2}:[0-9]{2}"
              placeholder={'00:00'}
              min="00:00"
              max="23:59"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </>
        {timeOptions.map((time, index) => (
          <div
            key={index}
            className={cn(styles.row, styles.hoverableRow)}
            onClick={() => onRowSelect(time)}>
            {time}
          </div>
        ))}
        <>
          <div style={{ height: '8px', display: 'list-item' }}></div>
          <LineSeparator />
          <div
            className={cn(styles.inputRow, styles.hoverableRow)}
            onClick={() => onSubtract && onSubtract(timeSubtract)}>
            <div className={cn(styles.iconContainer)}>
              <img
                className={cn(styles.minusIcon)}
                src="/icons/design-system/timeTracking/Minus-big.svg"
              />
            </div>
            <input
              type="text"
              onChange={handleSubtractTimeChange}
              className={styles.InputTextStyle}
              pattern="[0-9]{2}:[0-9]{2}"
              placeholder={'00:00'}
              min="00:00"
              max="23:59"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </>
      </div>
    </div>
  );
}
