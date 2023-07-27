import { useState } from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import { Dialog, DialogContent } from '@ovvio/styles/lib/components/dialog';
import { H3, Text } from '@ovvio/styles/lib/components/texts';
import { IconButton, Button } from '@ovvio/styles/lib/components/buttons';
import { IconClose } from '@ovvio/styles/lib/components/icons';
import Gallery from './pages-images';

const useStyles = makeStyles(theme => ({
  dialog: {
    padding: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  smaller: {
    maxWidth: styleguide.gridbase * 70,
  },
  galleryImage: {
    width: '100%',
    paddingTop: '50%',
    boxSizing: 'border-box',
    backgroundColor: 'black',
  },
  indicatorContainer: {
    height: styleguide.gridbase * 2.5,
    marginTop: styleguide.gridbase * 2,
    basedOn: [layout.row, layout.centerCenter],
  },
  content: {
    marginTop: styleguide.gridbase,
    padding: styleguide.gridbase * 3,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: styleguide.gridbase * 1.5,
    right: styleguide.gridbase * 1.5,
    width: styleguide.gridbase * 3,
    height: styleguide.gridbase * 3,
  },
  title: {
    fontSize: 24,
    lineHeight: 0.92,
    fontWeight: 'normal',
    color: '#273142',
    marginBottom: styleguide.gridbase * 2,
  },
  text: {
    display: 'block',
    lineHeight: 1.63,
    color: 'rgba(17, 8, 43, 0.6)',
    marginBottom: styleguide.gridbase * 2,
  },
  indicator: {
    width: styleguide.gridbase * 2.5,
    height: styleguide.gridbase * 2.5,
    margin: [0, 2],
    basedOn: [layout.column, layout.centerCenter],
  },
  circle: {
    height: styleguide.gridbase,
    width: styleguide.gridbase,
    border: `1px solid ${theme.background[0]}`,
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
    transition: `background-color linear ${styleguide.transition.duration.short}ms`,
    cursor: 'pointer',
    borderRadius: '50%',
  },
  current: {
    circle: {
      backgroundColor: theme.background[0],
    },
  },
  flipperRoot: {
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  scroller: {
    flexShrink: 0,
    overflow: 'visible',
    ...styleguide.transition.standard,
    transitionProperty: 'transform',
    basedOn: [layout.row],
  },
  previous: {
    flexShrink: 0,
    minWidth: styleguide.gridbase * 11,
    height: styleguide.gridbase * 4,
    borderRadius: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    border: `solid 1px ${theme.primary[500]}`,
    color: theme.primary[500],
    textTransform: 'uppercase',
  },
  next: {
    flexShrink: 0,
    minWidth: styleguide.gridbase * 11,
    height: styleguide.gridbase * 4,
    borderRadius: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    color: theme.background[0],
    backgroundColor: theme.primary[500],
    textTransform: 'uppercase',
  },
}));

function shouldShowOnboard() {
  return false; //!localStorage.getItem('onboard_seen');
}

function GalleryImage({ pages, page }) {
  return <Gallery page={page} />;
}

function PageIndicator({ pages, currentPage, onPageChanged }) {
  const styles = useStyles();
  return (
    <div className={cn(styles.indicatorContainer)}>
      {pages.map((_, i) => (
        <div
          key={i}
          className={cn(styles.indicator, i === currentPage && styles.current)}
        >
          <div className={cn(styles.circle)} onClick={() => onPageChanged(i)} />
        </div>
      ))}
    </div>
  );
}

const PAGES = [
  {
    title: 'Welcome to Ovvio',
    text: 'Alright, so let’s dive right in, Ovvio is your all in one, notepad-based task management platform for your team, built specifically for your project’s success',
  },
  {
    title: 'Create a Note',
    text: 'This is the heart and soul of Ovvio - take meeting minutes, create lists or just jot down personal ideas. Additionally, you can create, assign and tag tasks straight from your note',
  },
  {
    title: 'Ovvio 101',
    text: 'Use keyboard shortcuts or select text to activate the formatting toolbar, where you can assign and tag tasks, format text and create lists',
  },
  {
    title: 'Ovvio is Better Together',
    text: 'Invite people to join your workspace in order to collaborate with you. Invite your team members, clients or anyone else you want',
  },
];

function PageFlipper({ pages, currentIndex }) {
  const styles = useStyles();
  const style = {
    transform: `translateX(${(-100 / pages.length) * currentIndex}%)`,
    width: `${pages.length * 100}%`,
  };
  return (
    <div className={cn(styles.flipperRoot)}>
      <div className={cn(styles.scroller)} style={style}>
        {pages.map((p, i) => (
          <div key={i} style={{ width: `${100 / pages.length}%` }}>
            <H3 className={cn(styles.title)}>{p.title}</H3>
            <Text className={cn(styles.text)}>{p.text}</Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OnboardView() {
  const styles = useStyles();
  const [open, setOpen] = useState(shouldShowOnboard);
  const [page, setPage] = useState(0);

  const done = () => {
    localStorage.setItem('onboard_seen', Date.now() + '');
    setOpen(false);
  };

  const next = () => {
    if (page >= PAGES.length - 1) {
      return done();
    }
    setPage(p => p + 1);
  };

  const previous = () => {
    if (page <= 0) {
      return;
    }
    setPage(p => p - 1);
  };

  return (
    <Dialog
      className={cn(styles.dialog)}
      open={open}
      renderIndicator={() => (
        <PageIndicator
          pages={PAGES}
          currentPage={page}
          onPageChanged={p => setPage(p)}
        />
      )}
    >
      <DialogContent className={cn(styles.smaller)}>
        <GalleryImage page={page} pages={PAGES} />
        <IconButton className={cn(styles.closeBtn)} onClick={done}>
          <IconClose />
        </IconButton>
        <div className={cn(styles.content)}>
          <PageFlipper pages={PAGES} currentIndex={page} />
          <div className={cn(layout.row)}>
            {page !== 0 && (
              <Button
                className={cn(styles.previous)}
                onClick={previous}
                disabled={page === 0}
              >
                Previous
              </Button>
            )}
            <div className={cn(layout.flexSpacer)} />
            <Button className={cn(styles.next)} onClick={next}>
              {page >= PAGES.length - 1 ? 'Done' : 'Ok, Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
