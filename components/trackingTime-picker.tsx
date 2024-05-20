import * as SetUtils from '../base/set.ts';
import React, { useEffect, useRef, useState } from 'react';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { LineSeparator, useMenuContext } from '../styles/components/menu.tsx';
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { Note } from '../cfds/client/graph/vertices/note.ts';
import { usePartialVertex } from '../web-app/src/core/cfds/react/vertex.ts';

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
    cursor: 'pointer',
  },
  selectedItem: {
    backgroundColor: '#FBF6EF',
  },
}));

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

type TimeTrackPickerProps = {
  card: VertexManager<Note>;
};

export default function TimeTrackPicker({ card }: TimeTrackPickerProps) {
  const styles = useStyles();
  const menuCtx = useMenuContext();
  const componentRef = useRef<HTMLDivElement>(null);
  const [timeAdd, setTimeAdd] = useState('00:00');
  const [timeSubtract, setTimeSubtract] = useState('00:00');
  const [enableSubtract, setEnableSubtract] = useState(false);
  const [addedTimeToday, setAddedTimeToday] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputAddRef = useRef<HTMLInputElement>(null);
  const inputSubtractRef = useRef<HTMLInputElement>(null);
  const pCard = usePartialVertex(card);
  const timeOptions = ['00:15', '00:30', '00:45', '01:00'];
  const timeOptionRefs = useRef(
    timeOptions.map(() => React.createRef<HTMLDivElement>())
  );

  useEffect(() => {
    if (inputAddRef.current) {
      inputAddRef.current.focus();
      setSelectedIndex(0);
    }
  }, []);

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
    const today = new Date().toDateString();
    const currentUser = pCard.graph.rootKey;
    const filteredEntries = SetUtils.filter(pCard.timeTrack, (entry) => {
      return (
        entry.creationDate.toDateString() === today &&
        entry.user === currentUser
      );
    });

    const totalTimeToday = Array.from(filteredEntries).reduce(
      (sum, entry) => sum + entry.time,
      0
    );

    if (totalTimeToday > 0) {
      setEnableSubtract(true);
      setAddedTimeToday(totalTimeToday);
    } else {
      setEnableSubtract(false);
      setAddedTimeToday(0);
    }
  }, [pCard.timeTrack]);

  const handleFocus = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.setSelectionRange(0, 0);
  };

  const handleAddTimeClick = () => {
    const minutesToAdd = timeToMinutes(timeAdd);
    pCard.addTime(minutesToAdd);
    setTimeAdd('00:00');
    setEnableSubtract(true);
    setAddedTimeToday((prev) => prev + minutesToAdd);
    menuCtx.close();
  };

  const handleSubtractTimeClick = () => {
    const minutesToSubtract = timeToMinutes(timeSubtract);
    if (minutesToSubtract <= addedTimeToday) {
      pCard.subtractTime(minutesToSubtract);
      setTimeSubtract('00:00');
      setAddedTimeToday((prev) => prev - minutesToSubtract);
      menuCtx.close();
    } else {
      alert('You cannot subtract more time than you added today.');
    }
  };
  const formatTimeInput = (rawInput: string) => {
    const numbers = rawInput.replace(/\D/g, '');
    let formatted = '';
    if (numbers.length > 0) {
      formatted = numbers.substring(0, 2);
      if (numbers.length > 2) {
        formatted += ':' + numbers.substring(2, 4);
      }
    }

    return formatted.padEnd(4, '_').replace(/_/g, '0'); // Pad with zeros to maintain '00:00' format
  };

  const handleAddTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputElement = event.target;
    let { selectionStart } = inputElement;
    const formattedInput = formatTimeInput(event.target.value);
    setTimeAdd(formattedInput);
    // Ensure the cursor position is correct after state update
    window.requestAnimationFrame(() => {
      if (selectionStart && selectionStart > 2) {
        ++selectionStart;
      }
      inputElement.selectionStart = inputElement.selectionEnd = selectionStart;
    });
  };
  const handleSubtractTimeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputElement = event.target;
    let { selectionStart } = inputElement;
    const formattedInput = formatTimeInput(event.target.value);
    setTimeSubtract(formattedInput);
    window.requestAnimationFrame(() => {
      if (selectionStart && selectionStart > 2) {
        ++selectionStart;
      }
      inputElement.selectionStart = inputElement.selectionEnd = selectionStart;
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const { key } = event;
    const elements = [
      inputAddRef.current,
      ...timeOptionRefs.current.map((ref) => ref.current),
      enableSubtract ? inputSubtractRef.current : null,
    ].filter(Boolean);

    if (key === 'Enter') {
      event.preventDefault();
      if (selectedIndex === 0) {
        handleAddTimeClick();
      } else if (
        enableSubtract &&
        event.currentTarget === inputSubtractRef.current
      ) {
        handleSubtractTimeClick();
      } else {
        pCard.addTime(timeToMinutes(timeOptions[selectedIndex - 1]));
        menuCtx.close();
      }
    } else if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      let newIndex = selectedIndex;
      if (key === 'ArrowDown' && selectedIndex < elements.length - 1) {
        newIndex = selectedIndex + 1;
      } else if (key === 'ArrowUp' && selectedIndex > 0) {
        newIndex = selectedIndex - 1;
      }

      setSelectedIndex(newIndex);
    } else if (key === 'Escape') {
      menuCtx.close();
    } else if (
      !['Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Delete'].includes(
        event.key
      ) &&
      !(event.key >= '0' && event.key <= '9')
    ) {
      event.preventDefault();
    }
  };

  return (
    <div ref={componentRef} className={cn(styles.tableContainer)}>
      <div className={cn(styles.tableContent)}>
        <div className={cn(styles.inputRow, styles.hoverableRow)}>
          <div className={cn(styles.iconContainer)}>
            <img
              className={cn(styles.minusIcon)}
              src="/icons/design-system/timeTracking/Plus-big.svg"
              onClick={handleAddTimeClick}
            />
          </div>
          <input
            ref={inputAddRef}
            type="text"
            className={styles.InputTextStyle}
            value={timeAdd}
            onChange={handleAddTimeChange}
            onKeyDown={handleKeyDown}
            placeholder="00:00"
            onFocus={handleFocus}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        {timeOptions.map((time, index) => (
          <div
            key={index}
            ref={timeOptionRefs.current[index]}
            className={cn(
              styles.row,
              styles.hoverableRow,
              selectedIndex === index + 1 && styles.selectedItem
            )}
            tabIndex={0}
            onClick={() => pCard.addTime(timeToMinutes(time))}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => setSelectedIndex(index + 1)}>
            {time}
          </div>
        ))}
        {enableSubtract && (
          <>
            <div style={{ height: '8px', display: 'list-item' }}></div>
            <LineSeparator />
            <div className={cn(styles.inputRow, styles.hoverableRow)}>
              {' '}
              <div className={cn(styles.iconContainer)}>
                <img
                  className={cn(styles.minusIcon)}
                  src="/icons/design-system/timeTracking/Minus-big.svg"
                  onClick={handleSubtractTimeClick}
                />
              </div>
              <input
                ref={inputSubtractRef}
                type="text"
                className={styles.InputTextStyle}
                value={timeSubtract}
                onChange={handleSubtractTimeChange}
                onKeyDown={handleKeyDown}
                placeholder="00:00"
                onFocus={handleFocus}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
