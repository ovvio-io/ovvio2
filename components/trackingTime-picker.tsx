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

  const handleFocus = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.setSelectionRange(0, 0);
  };

  const handleAddTimeClick = () => {
    pCard.addTime(timeToMinutes(timeAdd));
    setTimeAdd('00:00');
  };

  const handleSubtractTimeClick = () => {
    pCard.subtractTime(timeToMinutes(timeSubtract));
    setTimeSubtract('00:00');
  };

  const formatTimeInput = (rawInput: string) => {
    const numbers = rawInput.replace(/\D/g, ''); // Strip all non-digits
    let formatted = '';

    if (numbers.length > 0) {
      formatted = numbers.substring(0, 2); // Take first two digits for hours
      if (numbers.length > 2) {
        formatted += ':' + numbers.substring(2, 4); // Add colon and next two digits for minutes
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
      console.log(selectionStart, { selectionStart });
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

  // const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
  //   if (['Enter'].includes(event.key)) {
  //     event.preventDefault(); // Prevent default form submission behavior
  //     if (event.currentTarget === inputAddRef.current) {
  //       handleAddTimeClick();
  //     } else if (event.currentTarget === inputSubtractRef.current) {
  //       handleSubtractTimeClick();
  //     }
  //   } else if (
  //     ![
  //       'Backspace',
  //       'ArrowLeft',
  //       'ArrowRight',
  //       'Tab',
  //       'Delete',
  //       'Escape',
  //     ].includes(event.key) &&
  //     !(event.key >= '0' && event.key <= '9')
  //   ) {
  //     event.preventDefault(); // Prevent typing non-numeric characters
  //   }
  // };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = event;
    if (['Enter'].includes(key)) {
      event.preventDefault(); // Prevent default form submission behavior
      if (event.currentTarget === inputAddRef.current) {
        handleAddTimeClick();
      } else if (event.currentTarget === inputSubtractRef.current) {
        handleSubtractTimeClick();
      }
    } else if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      let currentIndex = -1;
      const elements = [
        inputAddRef.current,
        ...timeOptionRefs.current.map((ref) => ref.current),
        inputSubtractRef.current,
      ];
      elements.forEach((element, index) => {
        if (document.activeElement === element) {
          currentIndex = index;
        }
      });
      if (key === 'ArrowDown' && currentIndex < elements.length - 1) {
        elements[currentIndex + 1]?.focus();
      } else if (key === 'ArrowUp' && currentIndex > 0) {
        elements[currentIndex - 1]?.focus();
      }
    } else if (
      ![
        'Backspace',
        'ArrowLeft',
        'ArrowRight',
        'Tab',
        'Delete',
        'Escape',
      ].includes(event.key) &&
      !(event.key >= '0' && event.key <= '9')
    ) {
      event.preventDefault(); // Prevent typing non-numeric characters
    }
  };
  const handleTimeOptionKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    time: string
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      pCard.addTime(timeToMinutes(time)); // Trigger add time with the specific time option
    }
  };
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
  // TODO:  was in the middle of fixing the focus on the input field and the functionallity of the arrow down and arrowUp.
  // i need to use something like setSelectedIndex((x) => (x + 1) % items.length) .
  // also consider delete the handleKeyDown(get the prev version - its simpler) and remove handleTimeOptionKeyDown ().

  return (
    <div ref={componentRef} className={cn(styles.tableContainer)}>
      <div className={cn(styles.tableContent)} onKeyDown={onKeyDown}>
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
            className={cn(styles.row, styles.hoverableRow)}
            tabIndex={0} // Make div focusable
            onClick={() => pCard.addTime(timeToMinutes(time))}
            onKeyDown={(e) => handleTimeOptionKeyDown(e, time)}>
            {time}
          </div>
        ))}
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
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
}
