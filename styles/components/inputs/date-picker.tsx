import React, { useState, useRef } from 'react';
import { makeStyles, cn } from '../../css-objects/index.ts';
import { styleguide } from '../../styleguide.ts';
import { layout } from '../../layout.ts';
import { Button } from '../buttons.tsx';
import { H3 } from '../texts.tsx';
import { getMonthName, getLocaleWeekDays } from '../../utils/dateutils.ts';

const useStyles = makeStyles(
  (theme) => ({
    root: {
      alignItems: 'stretch',
      basedOn: [layout.column],
    },
    arrowButton: {
      width: styleguide.gridbase * 4.5,
      height: styleguide.gridbase * 4.5,
      borderRadius: styleguide.gridbase * 1.5,
      border: `1px solid ${theme.background[500]}`,
    },
    week: {
      justifyContent: 'space-between',
      basedOn: [layout.row],
    },
    selected: {},
    dayTile: {
      display: 'inline-block',
      width: styleguide.gridbase * 5,
      height: styleguide.gridbase * 5,
      borderRadius: styleguide.gridbase * 2.5,
      backgroundColor: theme.background[0],
      transition: `background-color linear ${styleguide.transition.duration.short}ms`,
      color: '#9cb2cd',
      ':hover': {
        backgroundColor: 'rgba(249, 101, 0, 0.15)',
      },
      '&selected': {
        color: 'white',
        backgroundColor: theme.primary[500],
      },
    },
    month: {
      marginBottom: styleguide.gridbase * 2,
      basedOn: [layout.row],
    },
    monthText: {
      textAlign: 'center',
      basedOn: [layout.flexSpacer],
    },
    dayHeader: {
      display: 'inline-block',
      color: '#9cb2cd',
      height: styleguide.gridbase * 3,
      width: styleguide.gridbase * 5,
    },
    otherMonth: {
      color: '#d8e3f1',
    },
  }),
  'date-picker_089a9b'
);

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function isDateEqual(a, b) {
  if (!a || !b) {
    return false;
  }

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function MonthView({ month, year, selectedDate, onChange }) {
  const styles = useStyles();
  const daysCount = getDaysInMonth(year, month);

  const days = new Array(daysCount);
  for (let i = 0; i < daysCount; i++) {
    days[i] = new Date(year, month, i + 1);
  }
  const fd = days[0];

  for (let i = 1; fd.getDay() - i >= 0; i++) {
    days.unshift(new Date(year, month, fd.getDate() - i));
  }

  const ld = days[days.length - 1];
  for (let i = ld.getDay() + 1; i < 7; i++) {
    days.push(new Date(year, month, ld.getDate() + i));
  }
  const weeks = [];
  while (days.length) {
    weeks.push(days.splice(0, 7));
  }

  return (
    <div>
      <div className={cn(styles.week)}>
        {getLocaleWeekDays().map((d) => (
          <span key={d} className={cn(styles.dayHeader)}>
            {d}
          </span>
        ))}
      </div>
      {weeks.map((days, i) => (
        <div key={`${year}|${month}|${i}`} className={cn(styles.week)}>
          {days.map((d) => (
            <Button
              key={d.toDateString()}
              className={cn(
                styles.dayTile,
                d.getMonth() !== month && styles.otherMonth,
                isDateEqual(d, selectedDate) && styles.selected
              )}
              onClick={() => onChange(d)}
            >
              {d.getDate()}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  className?: string;
}
export default function DatePicker({
  value,
  onChange,
  className,
}: DatePickerProps) {
  const styles = useStyles();
  const startDate = useRef(value || new Date());
  const [month, setMonth] = useState(() => startDate.current.getMonth());
  const [year, setYear] = useState(() => startDate.current.getFullYear());

  const back = () => {
    if (month === 0) {
      setMonth(11);
      setYear((x) => x - 1);
    } else {
      setMonth((x) => x - 1);
    }
  };

  const next = () => {
    if (month === 11) {
      setMonth(0);
      setYear((x) => x + 1);
    } else {
      setMonth((x) => x + 1);
    }
  };
  return (
    <div className={cn(styles.root, className)}>
      <div className={cn(styles.month)}>
        <Button className={cn(styles.arrowButton)} onClick={back}>
          {'<'}
        </Button>
        <H3 className={cn(styles.monthText)}>
          {getMonthName(month)} {year}
        </H3>
        <Button className={cn(styles.arrowButton)} onClick={next}>
          {'>'}
        </Button>
      </div>
      <MonthView
        month={month}
        year={year}
        selectedDate={value}
        onChange={onChange}
      />
    </div>
  );
}
