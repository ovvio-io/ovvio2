import React, { useCallback } from 'react';
import Layer from '../../../../../styles/components/layer.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../styles/layout.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import {
  LabelSm,
  useTypographyStyles,
} from '../../../../../styles/components/typography.tsx';
import { useNavigate } from 'react-router';
import { IconMenuClose } from '../../../../../styles/components/new-icons/icon-menu-close.tsx';
import { PluginManager } from '../plugins/plugin-manager.tsx';
import { SettingsTabPlugin } from '../plugins/plugins-list.tsx';
import { createUseStrings } from '../../../core/localization/index.tsx';
import localization from '../settings.strings.json' assert { type: 'json' };

const EXPANDED_WIDTH = styleguide.gridbase * 25;

const useStyles = makeStyles(() => ({
  root: {
    flexShrink: 0,
    width: '90vw',
    maxWidth: EXPANDED_WIDTH,
    height: '100%',
    ...styleguide.transition.standard,
    transitionProperty: 'width',
    boxShadow: theme.shadows.z4,
    backgroundColor: theme.colors.background,
    basedOn: [layout.column],
  },
  header: {
    width: '100%',
    flexShrink: 0,
    height: '85px',
    justifyContent: 'space-between',
    basedOn: [layout.column],
    padding: '16px 0px 51px 16px',
  },
  action: {
    cursor: 'pointer',
    userSelect: 'none',
    height: styleguide.gridbase * 5,
    boxSizing: 'border-box',
    width: '100%',
    backgroundColor: theme.colors.secondaryButton,
    color: theme.colors.barActionText,
    alignItems: 'center',
    padding: styleguide.gridbase * 2,
    marginBottom: styleguide.gridbase * 0.5,
    ':last-child': {
      marginBottom: 0,
    },
    ':hover': {
      backgroundColor: theme.secondary.s4,
      //   backgroundColor: theme.colors.secondaryButtonActive,
      color: theme.colors.text,
    },
    basedOn: [layout.row],
  },
  disabled: {
    cursor: 'not-allowed',
  },
  actionIcon: {
    marginRight: styleguide.gridbase,
    basedOn: [layout.column, layout.centerCenter],
  },
  actionText: {
    whiteSpace: 'nowrap',
    color: 'currentColor',
    basedOn: [useTypographyStyles.button, layout.column, layout.centerCenter],
  },
  back: {
    display: 'flex',
    width: '85px',
    // gap: '4px',
    padding: '5px 0px 5px 14px',
    background: theme.colors.primaryButton,
    height: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    borderRadius: '37px',
    ...styleguide.transition.short,
    transitionProperty: 'box-shadow',
    ':hover': {
      boxShadow: theme.shadows.z2,
    },
    alignItems: 'center',
    basedOn: [layout.row],
    cursor: 'pointer',
  },
  text: {
    color: theme.colors.primaryButtonText,
    padding: [0, styleguide.gridbase],
    basedOn: [useTypographyStyles.button],
  },
}));

const BackButton = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const styles = useStyles();
    const navigate = useNavigate();
    const goBack = () => {
      navigate('/');
    };

    return (
      <div className={cn(styles.back, className)} onClick={goBack} ref={ref}>
        <IconMenuClose />
        <span className={cn(styles.text)}>Back</span>
      </div>
    );
  }
);

interface CategoryMap {
  [key: string]: SettingsTabPlugin[];
}

export interface SettingsBarCategoriesProps {
  className?: string;
}

const useStrings = createUseStrings(localization);

function SettingsBarCategories({ className }: SettingsBarCategoriesProps) {
  const styles = useStyles();
  const strings = useStrings();
  const navigate = useNavigate();

  const tabPlugins = PluginManager.getTabPlugins();

  const categories = tabPlugins.reduce<CategoryMap>((acc, plugin) => {
    const category = plugin.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(plugin);
    return acc;
  }, {});

  const navigateToCategory = (category: string) => {
    const categoryTabs = categories[category];

    if (categoryTabs && categoryTabs.length > 0) {
      navigate(`/settings/${category}/${categoryTabs[0].title}`);
    }
  };

  const categoryElements = Object.keys(categories).map((category) => (
    <div
      key={category}
      className={cn(styles.action)}
      onClick={() => navigateToCategory(category)}
    >
      <div className={cn(styles.actionIcon)}>
        {/*   need a way to dynamically assign icons based on category */}
      </div>
      <div className={cn(styles.actionText)}>{strings[category]}</div>
    </div>
  ));
  return <div className={cn(styles.root, className)}>{categoryElements}</div>;
}

export function SettingsBar({ className }: { className?: string }) {
  const styles = useStyles();

  return (
    <Layer priority={2}>
      {(style) => (
        <div style={style} className={cn(styles.root, className)}>
          <div className={cn(styles.header)}>
            <BackButton />
            <LabelSm>Settings</LabelSm>
          </div>
          <SettingsBarCategories />
        </div>
      )}
    </Layer>
  );
}
