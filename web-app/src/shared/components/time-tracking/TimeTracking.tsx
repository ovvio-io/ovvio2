import React, { useContext, useEffect, useState } from 'react';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { Button } from '../../../../../styles/components/buttons.tsx';
import Menu from '../../../../../styles/components/menu.tsx';
import TimeTrackPicker from '../../../../../components/trackingTime-picker.tsx';
import { Note } from '../../../../../cfds/client/graph/vertices/note.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { usePartialVertex } from '../../../core/cfds/react/vertex.ts';
import {
  DisplayToastFunction,
  ToastProvider,
} from '../../../../../styles/components/toast/index.tsx';

const useStyles = makeStyles(() => ({
  timeTrackText: {
    color: '#4D4D4D',
    fontSize: '10px',
    fontWeight: '400',
    lineHeight: '14px',
    letterSpacing: '-0.1px',
  },
  baseStyle: {
    opacity: '50%',
    ...styleguide.transition.short,
    transitionProperty: 'opacity',
  },
  hoverStyle: {
    opacity: '100%',
  },
  clockContainer: {
    width: '50px',
    height: '16px',
    display: 'flex',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: '8px',
  },
  clock: { width: '16px', height: '16px' },
  clockSvg: {
    height: '100%',
  },
  clockHand: {
    transformOrigin: '50% 50%',
    transition: 'transform 0.5s ease-in-out',
  },
}));

export function minutesToHHMM(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.abs(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}`;
}
interface ClockProps {
  totalMinutes: number;
}

export const Clock: React.FC<ClockProps> = ({ totalMinutes }) => {
  const styles = useStyles();
  const [hourAngle, setHourAngle] = useState(0);
  const [minuteAngle, setMinuteAngle] = useState(0);

  useEffect(() => {
    const deltaHours = totalMinutes / 60;
    const newHourAngle = hourAngle + deltaHours;
    const newMinuteAngle = minuteAngle + totalMinutes;
    setHourAngle(newHourAngle);
    setMinuteAngle(newMinuteAngle);
  }, [totalMinutes]);

  return (
    <div className={styles.clock}>
      <svg
        className={styles.clockSvg}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          opacity="0.6"
          d="M8 15C11.866 15 15 11.866 15 8"
          stroke="#3F3F3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.6"
          d="M8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1"
          stroke="#3F3F3F"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.6"
          d="M15 8C15 4.13401 11.866 1 8 1"
          stroke="#4D4D4D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className={styles.clockHand}
          style={{ transform: `rotate(${hourAngle}deg)` }}
          d="M8 8L10.5 10.5"
          stroke="#4D4D4D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className={styles.clockHand}
          style={{ transform: `rotate(${minuteAngle}deg)` }}
          d="M8 4.5459V8.00044"
          stroke="#262626"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
interface ClockWithPlusProps {
  totalMinutes: number;
  deltaMinutes: number;
}

export const ClockWithPlus: React.FC<ClockWithPlusProps> = ({
  totalMinutes,
  deltaMinutes,
}) => {
  const styles = useStyles();
  const [hourAngle, setHourAngle] = useState(0);
  const [minuteAngle, setMinuteAngle] = useState(0);
  useEffect(() => {
    const deltaHours = deltaMinutes / 60;
    const newHourAngle = hourAngle + deltaHours * 30; // 30deg per hour
    const newMinuteAngle = minuteAngle + deltaMinutes * 6; // 6deg per minute
    setHourAngle(newHourAngle);
    setMinuteAngle(newMinuteAngle);
  }, [deltaMinutes, totalMinutes]);

  return (
    <div className={styles.clock}>
      <svg
        className={styles.clockSvg}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0)">
          <path
            opacity="0.6"
            d="M8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1"
            stroke="#262626"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M15 8C15 4.13401 11.866 1 8 1"
            stroke="#4D4D4D"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            className={styles.clockHand}
            style={{ transform: `rotate(${hourAngle}deg)` }}
            d="M8 8L10 10"
            stroke="#4D4D4D"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            className={styles.clockHand}
            style={{ transform: `rotate(${minuteAngle}deg)` }}
            d="M8 4.5459V8.00044"
            stroke="#3F3F3F"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M13 15L13 11"
            stroke="#3F3F3F"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M11 13L15 13"
            stroke="#262626"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        <defs>
          <clipPath id="clip0">
            <rect width="16" height="16" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
};

interface TimeDisplayProps {
  card: VertexManager<Note>;
  deltaMinutes: number;
}

export function TimeDisplay({ card, deltaMinutes }: TimeDisplayProps) {
  const styles = useStyles();
  const pCard = usePartialVertex(card);
  const timeInMinutes = pCard?.totalTimeSpent;
  const formattedTime = timeInMinutes ? minutesToHHMM(timeInMinutes) : '';

  return (
    <div className={styles.clockContainer}>
      <ClockWithPlus totalMinutes={timeInMinutes} deltaMinutes={deltaMinutes} />
      <div className={styles.timeTrackText}>{formattedTime}</div>
    </div>
  );
}

export interface TimeTrackingProps {
  card: VertexManager<Note>;
  hover: boolean;
  className?: string;
}

export function TimeTrackingContainer({
  card,
  hover,
  className,
}: TimeTrackingProps) {
  const styles = useStyles();
  const [deltaMinutes, setDeltaMinutes] = useState(0);

  const handleDeltaChange = (delta: number) => {
    setDeltaMinutes(delta);
  };

  return (
    <ToastProvider>
      <Menu
        renderButton={() => (
          <Button
            className={cn(styles.baseStyle, hover && styles.hoverStyle)}
            onClick={() => {}}>
            <TimeDisplay card={card} deltaMinutes={deltaMinutes} />
          </Button>
        )}
        position="bottom"
        align="end"
        direction="out"
        className={className}>
        <TimeTrackPicker card={card} onDeltaChange={handleDeltaChange} />
      </Menu>
    </ToastProvider>
  );
}

export const displayMessageToast = (
  displayToast: DisplayToastFunction,
  messageText: string,
  type: 'action' | 'success' | 'failure' = 'action'
): void => {
  displayToast({
    text: messageText,
    type: type,
    duration: 3000,
  });
};
