import React from 'react';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import { TextField } from '../../../../../../../styles/components/inputs/index.ts';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import localization from '../cards-display.strings.json' assert { type: 'json' };
import { brandLightTheme as theme } from '../../../../../../../styles/theme.tsx';
import { useTextfieldStyles } from '../../../../../../../styles/components/inputs/TextField.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';

const useStyles = makeStyles(() => ({
  base: {
    position: 'relative',
    marginLeft: styleguide.gridbase * 3,
    basedOn: [layout.row, layout.flex],
  },

  input: {
    background:
      'radial-gradient(92.31% 92.31% at 7.69% 7.69%, rgba(255, 255, 255, 0.3) 0%, rgba(229, 229, 229, 0.3) 100%)',
    width: '100%',
    height: styleguide.gridbase * 4,
    border: `${theme.primary.p9} solid 1px`,
    borderRadius: styleguide.gridbase * 2,
    basedOn: [useTextfieldStyles.textField],
  },
  icon: {
    alignItems: 'flex-start',
    marginTop: styleguide.gridbase,
  },
  clear: {
    position: 'absolute',
    right: styleguide.gridbase,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 12,
    height: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    padding: [0, styleguide.gridbase],
    borderRadius: styleguide.gridbase * 0.75,
    backgroundColor: theme.mono.m1,
    color: theme.colors.text,
  },
}));

const useStrings = createUseStrings(localization);

export interface SearchFieldProps {
  query: string;
  setQuery: (query: string) => void;
}

export function SearchField({ query, setQuery }: SearchFieldProps) {
  const styles = useStyles();
  const strings = useStrings();
  const logger = useLogger();

  return (
    <div className={cn(styles.base)}>
      <TextField
        placeholder={strings.search}
        value={query}
        onChange={(e: any) => setQuery(e.target.value)}
        onFocus={() => {
          logger.log({
            severity: 'INFO',
            event: 'Start',
            source: 'toolbar:search',
            flow: 'edit',
          });
        }}
        onBlur={() => {
          logger.log({
            severity: 'INFO',
            event: 'End',
            source: 'toolbar:search',
            flow: 'edit',
          });
        }}
        className={cn(styles.input)}
      />
      {query && (
        <Button className={cn(styles.clear)} onClick={() => setQuery('')}>
          {strings.clear}
        </Button>
      )}
    </div>
  );
}
