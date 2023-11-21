import React from 'react';
import cssObjects, { cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import { IconCalendar } from '@ovvio/styles/lib/components/icons';
import { Text } from '@ovvio/styles/lib/components/texts';
import { Button } from '@ovvio/styles/lib/components/buttons';

const styles = cssObjects(theme => ({
  pill: {
    height: styleguide.gridbase * 4,
    borderRadius: styleguide.gridbase * 2,
    padding: [0, styleguide.gridbase],
    boxSizing: 'border-box',
    border: 'solid 1px rgba(156, 178, 205, 0.5)',
    basedOn: [layout.row, layout.centerCenter],
    marginRight: styleguide.gridbase,
  },
  text: {
    fontSize: styleguide.gridbase * 1.5,
    marginLeft: styleguide.gridbase * 0.5,
    marginRight: styleguide.gridbase,
    color: '#9cb2cd',
  },
  overdue: {
    color: '#fe4a62',
    borderColor: '#fe4a62',
  },
}));

function CloseIcon({ className, fill = '#9CB2CD' }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width="17"
      height="16"
      viewBox="0 0 17 16"
    >
      <defs>
        <path
          id="GeESpjv3P92aqjQP9Guc"
          d="M109.496 18.87L108.401 20l-2.78-2.87-2.782 2.87-1.095-1.13 2.781-2.87-2.78-2.87 1.094-1.13 2.781 2.87 2.781-2.87 1.095 1.13-2.78 2.87 2.78 2.87zM105.62 8c-4.283 0-7.752 3.58-7.752 8s3.47 8 7.752 8c4.283 0 7.752-3.58 7.752-8s-3.469-8-7.752-8z"
        />
      </defs>
      <g fill="none" fillRule="evenodd" transform="translate(-97 -8)">
        <use fill={fill} xlinkHref="#GeESpjv3P92aqjQP9Guc" />
      </g>
    </svg>
  );
}

export default function DatePill({ className, value, onDelete }) {
  const isOverdue = value < new Date();

  return (
    <div className={cn(className, styles.pill, isOverdue && styles.overdue)}>
        <IconDueDate
          state={isOverdue ? DueDateState.OverDue : DueDateState.Default}
        />      <Text className={cn(styles.text, isOverdue && styles.overdue)}>
        {value.toLocaleDateString()}
      </Text>
      <Button onClick={onDelete}>
        <CloseIcon fill={isOverdue ? '#fe4a62' : '#9cb2cd'} />
      </Button>
    </div>
  );
}
