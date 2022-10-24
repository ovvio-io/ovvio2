import { makeStyles, cn, keyframes } from '@ovvio/styles/lib/css-objects';
import { styleguide } from '@ovvio/styles/lib';
import * as pageOne from './page-1';
import * as pageTwo from './page-2';
import * as pageThree from './page-3';
import * as pageFour from './page-4';
import React from 'react';

const rotate = keyframes({
  from: {
    transform: 'rotate(0deg)',
  },
  to: {
    transform: 'rotate(360deg)',
  },
});
export const PAGE_TRANSITION_DURATION = 700;

const useStyles = makeStyles(theme => ({
  page: {
    position: 'relative',
    width: styleguide.gridbase * 70,
    height: styleguide.gridbase * 33.5,
    transition: `linear background-color ${PAGE_TRANSITION_DURATION}ms`,
    overflow: 'hidden',
  },
  doughnut: {
    animation: `${rotate} 600s linear infinite forwards`,
  },
  one: {
    backgroundColor: pageOne.backgroundColor,
    pinkDoughnut: {
      transform: 'translateY(0)',
    },
    laptop: {
      opacity: 1,
      transform: 'translateY(0)',
      transitionDelay: `${PAGE_TRANSITION_DURATION / 2}ms`,
    },
  },
  pinkDoughnut: {
    position: 'absolute',
    top: styleguide.gridbase * 8.5,
    left: styleguide.gridbase * 1.5,
    transform: 'translateY(100%)',
    ...styleguide.transition.standard,

    transitionDuration: `${PAGE_TRANSITION_DURATION}ms`,
    transitionProperty: 'transform',
  },
  laptop: {
    position: 'absolute',
    top: styleguide.gridbase * 8,
    right: 0,
    ...styleguide.transition.standard,
    opacity: 0,
    transitionDuration: `${PAGE_TRANSITION_DURATION / 2}ms`,
    transitionProperty: 'transform opacity',
    transitionDelay: '0ms',
    transform: 'translateY(12px)',
  },
  two: {
    backgroundColor: pageTwo.backgroundColor,
    tealDoughnut: {
      // animation: `${rotate} 360s linear infinite`,
      // animationDelay: `${
      // 	styleguide.transition.duration.standard
      // }ms`,
      transitionTimingFunction: styleguide.transition.timing.in,
      transform: 'translateX(0)',
    },
    textPopup: {
      opacity: 1,
      transform: 'translateY(0)',
      transitionDelay: `${PAGE_TRANSITION_DURATION / 2}ms`,
    },
  },
  tealDoughnut: {
    position: 'absolute',
    top: styleguide.gridbase * 5,
    right: styleguide.gridbase * 3,
    transform: 'translateX(120%) rotate(270deg)',
    ...styleguide.transition.standard,
    transitionTimingFunction: styleguide.transition.timing.in,
    transitionDuration: `${PAGE_TRANSITION_DURATION}ms`,
    transitionProperty: 'transform',
  },
  textPopup: {
    position: 'absolute',
    top: styleguide.gridbase * 10,
    left: styleguide.gridbase * 8,
    opacity: 0,
    ...styleguide.transition.standard,
    transitionDuration: `${PAGE_TRANSITION_DURATION / 2}ms`,
    transitionProperty: 'transform opacity',
    transitionDelay: '0ms',
    transform: 'translateY(12px)',
  },
  three: {
    backgroundColor: pageThree.backgroundColor,
    tags: {
      transform: 'translateX(0)',
    },
    brownDoughnut: {
      transform: 'translate(-50%, 0)',
    },
    fab: {
      opacity: 1,
      transform: 'scale(1)',
      transitionDelay: `${PAGE_TRANSITION_DURATION}ms`,
    },
    dropDown: {
      opacity: 1,
      transform: 'translateY(0)',
      transitionDelay: `${PAGE_TRANSITION_DURATION / 2}ms`,
    },
  },
  tags: {
    position: 'absolute',
    left: 0,
    top: styleguide.gridbase * 5.25,
    ...styleguide.transition.standard,
    transitionDuration: `${PAGE_TRANSITION_DURATION / 2}ms`,
    transitionProperty: 'transform',
    transform: 'translateX(-100%)',
  },
  brownDoughnut: {
    position: 'absolute',
    top: styleguide.gridbase * 6.5,
    left: '50%',
    transform: 'translateY(100%) rotateZ(-90deg)',
    ...styleguide.transition.standard,
    transformOrigin: 'bottom left',
    transitionDuration: `${PAGE_TRANSITION_DURATION}ms`,
    transitionProperty: 'transform',
  },
  fab: {
    position: 'absolute',
    bottom: styleguide.gridbase * 4,
    left: styleguide.gridbase * 16,
    ...styleguide.transition.standard,
    opacity: 0,
    transitionDuration: `${PAGE_TRANSITION_DURATION / 2}ms`,
    transitionProperty: 'transform, opacity',
    transitionDelay: '0ms',
    transform: 'scale(0)',
  },
  dropDown: {
    position: 'absolute',
    top: styleguide.gridbase * 3.5,
    right: styleguide.gridbase * 7,
    opacity: 0,
    ...styleguide.transition.standard,
    transitionDuration: `${PAGE_TRANSITION_DURATION / 2}ms`,
    transitionProperty: 'transform, opacity',
    transitionDelay: '0ms',
    transform: 'translateY(12px)',
  },
  four: {
    backgroundColor: pageFour.backgroundColor,
    brownDoughnut: {
      transformOrigin: 'bottom right',
      transform: 'translateY(100%) rotateZ(90deg)',
    },
    yellowDoughnut: {
      // animation: `${rotate} 360s linear infinite`,
      // animationDelay: `${
      // 	styleguide.transition.duration.standard
      // }ms`,
      transitionTimingFunction: styleguide.transition.timing.in,
      transform: 'translateX(0)',
      transitionDelay: '100ms',
    },
    mentions: {
      opacity: 1,
      transform: 'translateY(0)',
      transitionDelay: `${PAGE_TRANSITION_DURATION / 3}ms`,
    },
    toolbar: {
      opacity: 1,
      transform: 'translateY(0)',
      transitionDelay: `${PAGE_TRANSITION_DURATION / 3}ms`,
    },
  },
  yellowDoughnut: {
    position: 'absolute',
    top: styleguide.gridbase * 5.5,
    left: styleguide.gridbase * 18.75,
    transform: 'translateX(-402px) rotate(-270deg)',
    ...styleguide.transition.standard,
    transitionTimingFunction: styleguide.transition.timing.in,
    transitionDuration: `${PAGE_TRANSITION_DURATION}ms`,
    transitionProperty: 'transform',
  },
  mentions: {
    position: 'absolute',
    bottom: styleguide.gridbase * 2,
    left: styleguide.gridbase * 3,
    opacity: 0,
    ...styleguide.transition.standard,
    transitionDuration: `${PAGE_TRANSITION_DURATION / 2}ms`,
    transitionProperty: 'transform opacity',
    transitionDelay: '0ms',
    transform: 'translateY(12px)',
  },
  toolbar: {
    position: 'absolute',
    right: 0,
    top: styleguide.gridbase * 5,
    opacity: 0,
    ...styleguide.transition.standard,
    transitionDuration: `${PAGE_TRANSITION_DURATION / 2}ms`,
    transitionProperty: 'transform opacity',
    transitionDelay: '0ms',
    transform: 'translateX(12px)',
  },
}));

const BasePage: React.FC<{ className?: string }> = ({
  children,
  className,
}) => {
  const styles = useStyles();
  return <div className={cn(styles.page, className)}>{children}</div>;
};

interface GalleryProps {
  className?: string;
  page: number;
}

export default function Gallery({ page, className }: GalleryProps) {
  const styles = useStyles();
  const classes = ['one', 'two', 'three', 'four'];
  return (
    <BasePage className={cn(className, styles[classes[page]])}>
      <div className={cn(styles.pinkDoughnut)}>
        <pageOne.PinkDoughnut className={cn(styles.doughnut)} />
      </div>
      <pageOne.LaptopIllustration className={cn(styles.laptop)} />
      <div className={cn(styles.tealDoughnut)}>
        <pageTwo.TealDoughnut className={cn(styles.doughnut)} />
      </div>
      <pageTwo.TextPopup className={cn(styles.textPopup)} />
      <pageThree.TagsIllustration className={cn(styles.tags)} />
      <div className={cn(styles.brownDoughnut)}>
        <pageThree.BrownDoughnut className={cn(styles.doughnut)} />
      </div>
      <pageThree.FAB className={cn(styles.fab)} />
      <pageThree.DropDownIllustration className={cn(styles.dropDown)} />
      <pageFour.MentionsIllustration className={cn(styles.mentions)} />
      <div className={cn(styles.yellowDoughnut)}>
        <pageFour.YellowDoughnut className={cn(styles.doughnut)} />
      </div>
      <pageFour.ToolbarIllustration className={cn(styles.toolbar)} />
    </BasePage>
  );
}
