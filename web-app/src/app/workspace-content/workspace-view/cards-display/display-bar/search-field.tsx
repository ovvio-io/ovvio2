import { layout, styleguide } from '@ovvio/styles/lib';
import { Button } from '@ovvio/styles/lib/components/buttons';
import { TextField } from '@ovvio/styles/lib/components/inputs';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useEventLogger } from 'core/analytics';
import { createUseStrings } from 'core/localization';
import React from 'react';
import localization from '../cards-display.strings.json';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { useTextfieldStyles } from '@ovvio/styles/lib/components/inputs/TextField';

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
  const eventLogger = useEventLogger();

  return (
    <div className={cn(styles.base)}>
      <TextField
        placeholder={strings.search}
        value={query}
        onChange={(e: any) => setQuery(e.target.value)}
        onFocus={() => {
          eventLogger.action('CARD_SEARCH_FOCUSED', {});
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
