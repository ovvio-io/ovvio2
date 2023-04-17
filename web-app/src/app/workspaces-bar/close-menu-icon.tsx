import React from 'react';
import { styleguide } from '../../../../styles/styleguide.ts';
import { IconProps } from '../../../../styles/components/icons/IconBase.tsx';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';
import { useTheme } from '../../../../styles/theme.tsx';

const useStyles = makeStyles((theme) => ({
  path: {
    ...styleguide.transition.short,
    transitionProperty: 'd',
  },
  close: {
    d: 'path("M3 17h18v2H3v-2zm5-5.5h13v2H8v-2zM3 6h18v2H3V6z")',
  },
}));

export default function CloseMenuIcon({
  className,
  fill,
  isOpen,
}: IconProps & { isOpen?: boolean }) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <g fill="none" fillRule="evenodd">
        <path fill="transparent" d="M0 0h24v24H0z" />
        <path
          className={cn(styles.path, isOpen && styles.close)}
          fill={fill || theme.background.placeholderText}
          d="M3 17h18v2H3v-2zm5-5.5h7v2H3v-2zM3 6h18v2H3V6z"
        />
      </g>
    </svg>
  );
}
