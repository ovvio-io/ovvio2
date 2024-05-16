import React, { useContext } from 'react';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { IconProps } from '../../../../../styles/components/new-icons/types.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { Button } from '../../../../../styles/components/buttons.tsx';
import Menu from '../../../../../styles/components/menu.tsx';
import TimeTrackPicker from '../../../../../components/trackingTime-picker.tsx';
import { Tag } from '../../../../../cfds/client/graph/vertices/tag.ts';
import { Note } from '../../../../../cfds/client/graph/vertices/note.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { usePartialVertex } from '../../../core/cfds/react/vertex.ts';

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

function minutesToHHMM(minutes: number): string {
  let hours = Math.floor(minutes / 60);
  let mins = Math.abs(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}`;
}

export interface TimeDisplayProps {
  hover: boolean;
  card?: VertexManager<Note>;
}

export function TimeDisplay({ card, hover }: TimeDisplayProps) {
  const styles = useStyles();
  const pCard = usePartialVertex(card);
  const timeInMinutes = pCard?.totalTimeSpent;
  const formattedTime = timeInMinutes ? minutesToHHMM(timeInMinutes) : '';

  return (
    <div className={cn(styles.timeTrackText)}>
      {formattedTime ? `${formattedTime}` : ''}
    </div>
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
  plus: boolean;
}

export function TimeTracking({ card, hover, plus }: TimeTrackingProps) {
  const styles = useStyles();

  return (
    <Button
      className={cn(styles.baseStyle, hover && styles.hoverStyle)}
      onClick={() => {}}>
      <TimeDisplay card={card} hover={hover} />
      <IconTimeTracking plus={plus} hover={hover} />
    </Button>
  );
}

export interface TimeTrackingProps {
  card?: VertexManager<Note>;
  hover: boolean;
  plus: boolean;
  className?: string;
}

export function TimeTrackingContainer({
  card,
  hover,
  plus,
  className,
}: TimeTrackingProps) {
  const styles = useStyles();

  return (
    <Menu
      renderButton={() => (
        <TimeTracking card={card} hover={hover} plus={plus} />
      )}
      position="bottom"
      align="end"
      direction="out"
      className={className}>
      <TimeTrackPicker card={card!} />
    </Menu>
  );
}
