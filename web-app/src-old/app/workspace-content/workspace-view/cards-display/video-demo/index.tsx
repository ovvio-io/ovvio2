import { layout, styleguide } from '@ovvio/styles';
import { Backdrop } from '@ovvio/styles/lib/components/backdrop';
import { Button } from '@ovvio/styles/lib/components/buttons';
import { H2 } from '@ovvio/styles/lib/components/texts';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useEventLogger } from 'core/analytics';
import { useRootUser } from 'core/cfds/react/graph';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { createUseStrings } from 'core/localization';
import { useCallback } from 'react';
import localization from './video.strings.json';
import { PlayerState, StateChangeEvent, YoutubeVideo } from './youtube';

const useStrings = createUseStrings(localization);

const useStyles = makeStyles(
  theme => ({
    backdrop: {
      basedOn: [layout.column, layout.centerCenter],
    },
    playerContainer: {
      padding: styleguide.gridbase,
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      top: 0,
      left: 0,
      transform: 'translate(-100%, -100%)',
    },
  }),
  'video-demo_6b9719'
);

export const VideoTutorialId = 'VIDEO_DEMO';

const videoId = 'r4RtHjvyZEc';

function CloseVideoIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20.5356 20.5357L13.4645 13.4647"
        stroke="black"
        strokeLinecap="round"
      />
      <path
        d="M13.4644 20.5357L20.5355 13.4647"
        stroke="black"
        strokeLinecap="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.92893 24.0711C13.8342 27.9764 20.1658 27.9764 24.0711 24.0711C27.9763 20.1659 27.9763 13.8342 24.0711 9.92898C20.1658 6.02373 13.8342 6.02373 9.92893 9.92898C6.02369 13.8342 6.02369 20.1659 9.92893 24.0711Z"
        stroke="black"
      />
    </svg>
  );
}

const DISABLED = true;

export function VideoTutorial() {
  const strings = useStrings();
  const styles = useStyles();
  const user = useRootUser();
  const eventLogger = useEventLogger();

  const { seenTutorials } = usePartialVertex(user, ['seenTutorials']);
  const dismiss = () => {
    eventLogger.action('VIDEO_DEMO_CLOSED', {});
    const proxy = user.getVertexProxy();
    const tutorials = proxy.seenTutorials;
    tutorials.add(VideoTutorialId);
    proxy.seenTutorials = tutorials;
  };
  const isOpen = !DISABLED && !seenTutorials.has(VideoTutorialId);

  const onPlayerStateChange = useCallback(
    (event: StateChangeEvent) => {
      switch (event.data) {
        case PlayerState.Playing: {
          eventLogger.action('VIDEO_DEMO_PLAYING', {});
          break;
        }
        case PlayerState.Paused: {
          eventLogger.action('VIDEO_DEMO_PAUSED', {});
          break;
        }
        case PlayerState.Ended: {
          eventLogger.action('VIDEO_DEMO_ENDED', {});
          break;
        }
      }
    },
    [eventLogger]
  );

  return (
    <Backdrop highContrast className={cn(styles.backdrop)} open={isOpen}>
      <H2>{strings.gettingStarted}</H2>
      <div className={cn(styles.playerContainer)}>
        <YoutubeVideo
          overlayText={strings.spendTwoMinutes}
          videoId={videoId}
          onPlayerStateChange={onPlayerStateChange}
        />
        <Button className={cn(styles.closeButton)} onClick={dismiss}>
          <CloseVideoIcon />
        </Button>
      </div>
    </Backdrop>
  );
}
