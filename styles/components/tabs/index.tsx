import React, { MouseEvent } from 'react';
import { makeStyles, cn } from '../../css-objects/index.ts';
import { styleguide } from '../../styleguide.ts';
import { layout } from '../../layout.ts';
import { Button } from '../buttons.tsx';
import { brandLightTheme } from '../../theme.tsx';
import { useTypographyStyles } from '../typography.tsx';
import { NoteType } from '../../../cfds/client/graph/vertices/note.ts';
import { TabId } from '../../../cfds/base/scheme-types.ts';

const useStyles = makeStyles(
  (theme) => ({
    header: {
      position: 'relative',
      basedOn: [layout.row],
    },
    tab: {
      height: styleguide.gridbase * 6,
      color: brandLightTheme.colors.text,
      borderBottom: `1px solid ${brandLightTheme.supporting.O1}`,
      transitionDuration: `${styleguide.transition.duration.standard}ms`,
      transitionProperty: 'color',
      transitionTimingFunction: 'linear',
      basedOn: [layout.row, layout.centerCenter, useTypographyStyles.h5],
    },
    selected: {
      ...useTypographyStyles.label.rules,
    },
    selectedTabIndicator: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      height: 2,
      transform: 'translateX(0)',
      backgroundColor: brandLightTheme.supporting.O2,
      ...styleguide.transition.standard,
      transitionProperty: 'transform',
    },
    tabsRoot: {
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
    },
    tabsFlipper: {
      flexShrink: 0,
      overflow: 'visible',
      ...styleguide.transition.standard,
      transitionProperty: 'transform',
      basedOn: [layout.row],
    },
  }),
  'tabs_3a7361'
);

export type TabButtonProps = React.PropsWithChildren<{
  value: any;
  style?: any;
  isSelected?: boolean;
  setSelected?: any;
  className?: string;
  onSelected?: (value: any) => void;
}>;

export function TabButton({
  children,
  value,
  style,
  isSelected,
  setSelected,
  className,
  onSelected,
}: TabButtonProps) {
  const styles = useStyles();
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    setSelected(value);
    if (onSelected) {
      onSelected(value);
    }
  };

  return (
    <Button
      className={cn(styles.tab, isSelected && styles.selected, className)}
      style={style}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export type TabsHeaderProps = React.PropsWithChildren<{
  selected: TabId;
  setSelected: (type: TabId) => void;
  className?: string;
}>;
export function TabsHeader({
  children,
  selected,
  setSelected,
  className,
}: TabsHeaderProps) {
  const styles = useStyles();
  const count = React.Children.count(children);
  let selectedIndex = 0;
  return (
    <div className={cn(styles.header, className)}>
      {React.Children.map(children, (tab, i) => {
        if (!React.isValidElement(tab)) {
          return tab;
        }

        const { value } = tab.props as TabProps;
        const style = (tab.props as TabProps).style || {};
        const isSelected = value === selected;
        if (isSelected) {
          selectedIndex = i;
        }
        const newProps = {
          isSelected: isSelected,
          setSelected,
          style: {
            ...style,
            flexBasis: `${100 / count}%`,
          },
        };

        return React.cloneElement(tab, newProps);
      })}
      <div
        className={cn(styles.selectedTabIndicator)}
        style={{
          width: `${100 / count}%`,
          transform: `translateX(${100 * selectedIndex}%)`,
        }}
      />
    </div>
  );
}

export type TabsProps = React.PropsWithChildren<{
  selectedTab: NoteType;
  className?: string;
}>;
export function Tabs({ children, selectedTab, className }: TabsProps) {
  const styles = useStyles();
  let length = React.Children.count(children);
  let selectedIndex = 0;

  React.Children.forEach(children, (tab, index) => {
    if (!React.isValidElement(tab)) {
      length--;
      return;
    }
    if ((tab.props as TabProps).value === selectedTab) {
      selectedIndex = index;
    }
  });
  const style = {
    transform: `translateX(${(-100 / length) * selectedIndex}%)`,
    width: `${length * 100}%`,
  };

  const mappedChildren = React.Children.map(children, (tab, i) => {
    if (!React.isValidElement(tab)) {
      return tab;
    }
    const style = (tab.props as TabProps).style || {};
    const newProps = {
      style: {
        ...style,
        width: `${100 / length}%`,
      },
    };

    return React.cloneElement(tab, newProps);
  });

  return (
    <div className={cn(styles.tabsRoot, className)}>
      <div className={cn(styles.tabsFlipper)} style={style}>
        {mappedChildren}
        "AAAAAAAA"
      </div>
      "BBBBBB"
    </div>
  );
}

export type TabProps<TV = any> = React.PropsWithChildren<{
  style?: any;
  className?: string;
  value: TV;
}>;

export function Tab<TV>({ children, style, className }: TabProps<TV>) {
  return (
    <div style={style} className={className}>
      {children}
      "CCCCC"
    </div>
  );
}
