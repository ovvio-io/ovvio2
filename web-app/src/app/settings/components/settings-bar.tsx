import React from 'react';
import Layer from '../../../../../styles/components/layer.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../styles/layout.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import {
  LabelSm,
  useTypographyStyles,
} from '../../../../../styles/components/typography.tsx';
import { useNavigate, useParams } from 'react-router';
import { IconMenuClose } from '../../../../../styles/components/new-icons/icon-menu-close.tsx';
import { SettingsTabPlugin } from '../plugins/plugins-list.tsx';
import { createUseStrings } from '../../../core/localization/index.tsx';
import localization from '../settings.strings.json' assert { type: 'json' };
import { usePartialView } from '../../../core/cfds/react/graph.tsx';
import HelpCenter from '../../workspaces-bar/actions.tsx';
import { useTabPlugins } from '../plugins/plugins-list.tsx';
import { BackButton } from './settings-buttons.tsx';
import { BlueActionButton } from './settings-buttons.tsx';

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
  categories: {
    height: '90%',
  },
  help: {},
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

  text: {
    color: theme.colors.primaryButtonText,
    padding: `0px ${styleguide.gridbase}px`,
    basedOn: [useTypographyStyles.button],
  },
}));

interface CategoryMap {
  [key: string]: SettingsTabPlugin[];
}

export interface SettingsBarCategoriesProps {
  className?: string;
}

const useStrings = createUseStrings(localization);

function SettingsBarCategories({ className }: SettingsBarCategoriesProps) {
  const strings = useStrings();
  const navigate = useNavigate();
  const view = usePartialView('selectedSettingsTabId');
  const tabPlugins = useTabPlugins();
  const { category: currentCategory } = useParams<{ category: string }>();

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
      navigate(`/settings/${category}/${strings[categoryTabs[0].title]}`);
    }
  };

  // const navigateToCategory = (category: string) => {
  //   // Convert the category to lowercase and replace spaces with hyphens
  //   const formattedCategory = category
  //     .toLowerCase()
  //     .replace(/\s+/g, '-')
  //     .replace(/&/g, 'and'); // Optional: Replace '&' with 'and'

  //   const categoryTabs = categories[formattedCategory];

  //   if (categoryTabs && categoryTabs.length > 0) {
  //     navigate(
  //       `/settings/${formattedCategory}/${categoryTabs[0].title
  //         .toLowerCase()
  //         .replace(/\s+/g, '-')}`
  //     );
  //   }
  // };

  const styles = useStyles();
  const categoryElements = Object.keys(categories).map((category) => {
    return (
      <div
        key={category}
        className={cn(styles.action)}
        style={{
          backgroundColor:
            category === currentCategory ? theme.secondary.s7 : undefined,
        }}
        onClick={() => navigateToCategory(category)}
      >
        <div className={cn(styles.actionIcon)}>
          <img
            key="SelectedRowSettings"
            src={`/icons/settings/${strings[`${category}Bar`]}.svg`}
          />
        </div>
        <div className={cn(styles.actionText)}>{strings[category]}</div>
      </div>
    );
  });

  return (
    <div className={cn(styles.categories, className)}>{categoryElements}</div>
  );
}

export function SettingsBar({ className }: { className?: string }) {
  const styles = useStyles();
  const navigate = useNavigate();
  const goBack = () => {
    navigate('/');
  };
  return (
    <Layer priority={2}>
      {(style) => (
        <div style={style} className={cn(styles.root, className)}>
          <div className={cn(styles.header)}>
            <BlueActionButton
              onClick={goBack}
              disable={false}
              buttonText={'Back'}
              imgSrc={'/icons/design-system/Arrow-down-white.svg'}
            />
            <LabelSm>Settings</LabelSm>
          </div>
          <SettingsBarCategories />
          <div className={cn(styles.help)}>{/* <HelpCenter /> */}</div>
        </div>
      )}
    </Layer>
  );
}
