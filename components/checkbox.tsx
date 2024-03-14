import React, { useCallback } from 'react';
import { WritingDirection } from '../base/string.ts';
import { cn, keyframes, makeStyles } from '../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { Note } from '../cfds/client/graph/vertices/note.ts';
import { usePartialVertex } from '../web-app/src/core/cfds/react/vertex.ts';

const useStyles = makeStyles(() => ({
  taskCheckbox: {
    cursor: 'pointer',
  },
}));

export interface CheckBoxProps {
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function CheckBox({
  value,
  onChange,
  className,
  disabled,
}: CheckBoxProps) {
  const styles = useStyles();
  const src = `/icons/design-system/checkbox/${value ? '' : 'not-'}selected${
    disabled === true ? '-disabled' : ''
  }.svg`;
  const onClick = useCallback(
    (event: React.MouseEvent<HTMLImageElement>) => {
      if (!disabled) {
        onChange(!value);
      }
      event.preventDefault();
      event.stopPropagation();
    },
    [onChange, value],
  );

  return (
    <img
      className={cn(styles.taskCheckbox, className)}
      src={src}
      onClick={onClick}
    />
  );
}

export interface TaskCheckboxProps {
  task: VertexManager<Note>;
  className?: string;
}

export function TaskCheckbox({ task, className }: TaskCheckboxProps) {
  const partialNote = usePartialVertex(task, ['isChecked']);
  return (
    <CheckBox
      className={className}
      value={partialNote.isChecked}
      onChange={() => (partialNote.isChecked = !partialNote.isChecked)}
    />
  );
}
