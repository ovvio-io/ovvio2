import React from 'react';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { IconProps } from '../../../../../styles/components/new-icons/types.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { Button } from '../../../../../styles/components/buttons.tsx';
import Menu from '../../../../../styles/components/menu.tsx';
import TimeTrackPicker from '../../../../../components/trackingTime-picker.tsx';
import { Tag } from '../../../../../cfds/client/graph/vertices/tag.ts';

const useStyles = makeStyles(() => ({
  timeTrackText: {
    color: '#4D4D4D',
    fontSize: '10px',
    fontWeight: '400',
    lineHeight: '14px',
    letterSpacing: '-0.1px',
  },
  baseStyle: {
    gap: '4px',
    display: 'flex',
    alignItems: 'center',
    opacity: '50%',
    ...styleguide.transition.short,
    transitionProperty: 'opacity',
  },
  hoverStyle: {
    opacity: '100%',
  },
}));

export interface TimeDisplayProps {
  hover: boolean;
  time: string;
}

export function TimeDisplay({ hover, time }: TimeDisplayProps) {
  const styles = useStyles();
  return (
    <div className={cn(styles.timeTrackText)}>{time ? `${time}` : ''}</div>
  );
}

export interface IconTimeTracking extends IconProps {
  plus: boolean;
  hover: boolean;
}

export function IconTimeTracking({ plus, hover }: IconTimeTracking) {
  return plus ? (
    hover ? (
      <img
        key="IconTimeTrackPlusHover"
        src="/icons/design-system/timeTracking/plus-hover.svg"
      />
    ) : (
      <img
        key="IconTimeTrackPlusNoHover"
        src="/icons/design-system/timeTracking/plus-no-hover.svg"
      />
    )
  ) : hover ? (
    <img
      key="IconTimeTrackNoPlusHover"
      src="/icons/design-system/timeTracking/hover.svg"
    />
  ) : (
    <img
      key="IconTimeTrackNoPlusNoHover"
      src="/icons/design-system/timeTracking/no-hover.svg"
    />
  );
}

export interface TimeTrackingProps {
  hover: boolean;
  time: string;
  plus: boolean;
}

export function TimeTracking({ hover, time, plus }: TimeTrackingProps) {
  const styles = useStyles();

  return (
    <Button
      className={cn(styles.baseStyle, hover && styles.hoverStyle)}
      onClick={() => {}}>
      <TimeDisplay time={time} hover={hover} />
      <IconTimeTracking plus={plus} hover={hover} />
    </Button>
  );
}

export interface TimeTrackingProps {
  hover: boolean;
  time: string;
  plus: boolean;
  className?: string;
}

export function TimeTrackingContainer({
  hover,
  time,
  plus,
  className,
}: TimeTrackingProps) {
  const styles = useStyles();

  return (
    <Menu
      renderButton={() => (
        <TimeTracking hover={hover} time={time} plus={plus} />
      )}
      position="bottom"
      align="end"
      direction="out"
      className={className}
      // popupClassName={cn(styles.popup)}>
    >
      <TimeTrackPicker
        onRowSelect={function (tag: Tag): void {
          throw new Error('Function not implemented.');
        }}
      />{' '}
    </Menu>
  );
}
