import React from 'react'
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts'
import { IconProps } from '../../../../../styles/components/new-icons/types.ts'
import { styleguide } from '../../../../../styles/styleguide.ts'
import { Button } from '../../../../../styles/components/buttons.tsx'

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
}))

export interface TimeDisplayProps {
  hover: boolean
  time: string
}

export function TimeDisplay({ hover, time }: TimeDisplayProps) {
  const styles = useStyles()
  return <div className={cn(styles.timeTrackText)}>{time ? `${time}` : ''}</div>
}

export interface IconTimeTracking extends IconProps {
  plus: boolean
  hover: boolean
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
  )
}

export interface TimeTrackingProps {
  hover: boolean
  time: string
  plus: boolean
}

export function TimeTracking({ hover, time, plus }: TimeTrackingProps) {
  const styles = useStyles()
  return (
    <Button
      className={cn(styles.baseStyle, hover && styles.hoverStyle)}
      onClick={() => {}}
    >
      <TimeDisplay time={time} hover={hover} />
      <IconTimeTracking plus={plus} hover={hover} />
    </Button>
  )
}
