import { uniqueId } from '@ovvio/base/lib/utils';
import { layout, styleguide } from '@ovvio/styles';
import SpinnerView from '@ovvio/styles/lib/components/spinner-view';
import { H2 } from '@ovvio/styles/lib/components/texts';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useWindowSize } from '@ovvio/styles/lib/utils/hooks/use-window-size';
import {
  isServerSide,
  useIsomorphicLayoutEffect,
} from '@ovvio/styles/lib/utils/ssr';
import { useEffect, useMemo, useRef, useState } from 'react';

const useStyles = makeStyles(
  theme => ({
    root: {
      position: 'relative',
    },
    placeholder: {
      background: theme.background[900],
      basedOn: [layout.column, layout.centerCenter],
    },
    overlay: {
      display: 'none',
      position: 'absolute',
      boxSizing: 'border-box',
      alignItems: 'center',
      flexDirection: 'column',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      padding: styleguide.gridbase * 2,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      pointerEvents: 'none',
    },
    overlayVisible: {
      display: 'flex',
    },
    overlayText: {
      textAlign: 'center',
      color: theme.background[0],
    },
  }),
  'youtube_1c06bd'
);

export enum PlayerState {
  Initializing = -5,
  Unstarted = -1,
  Ended = 0,
  Playing = 1,
  Paused = 2,
  Buffering = 3,
  Cued = 5,
}

interface YoutubePlayer {
  setSize(width: number, height: number): void;
}
type NumberBoolean = 0 | 1;
interface PlayerOptions {
  height?: number;
  width?: number;
  videoId: string;
  playerVars?: {
    autoplay?: NumberBoolean;
    playsinline?: NumberBoolean;
    controls?: NumberBoolean;
    modestbranding?: NumberBoolean;
    rel?: NumberBoolean;
  };
  events?: PlayerEvents;
}

declare global {
  interface Window {
    YT: {
      Player: {
        new (elementId: string, options: PlayerOptions): YoutubePlayer;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}
export interface StateChangeEvent {
  data: PlayerState;
}

export type OnStateChangeListener = (event: StateChangeEvent) => void;

interface PlayerEvents {
  onReady?: (event: any) => void;
  onStateChange?: OnStateChangeListener;
}

export function useYoutubePlayer(elementId: string, playerOpts: PlayerOptions) {
  const [youtube, setYoutube] = useState(!isServerSide && window.YT);
  const [player, setPlayer] = useState<YoutubePlayer>();
  useEffect(() => {
    if (isServerSide || typeof window.YT !== 'undefined') {
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      setYoutube(window.YT);
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';

    document.body.appendChild(tag);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!youtube || !elementId) {
      return;
    }

    const p = new youtube.Player(elementId, playerOpts);
    setPlayer(p);
  }, [youtube, elementId, playerOpts]);

  return player;
}

export interface YoutubeVideoProps {
  width?: number;
  height?: number;
  onPlayerStateChange?: OnStateChangeListener;
  videoId: string;
  className?: string;
  overlayText?: string;
}

const DEFAULT_HEIGHT = 390;
const DEFAULT_WIDTH = 640;

function getPlayerSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  const aspectRatio = height / width;

  if (maxWidth > maxHeight) {
    return { width: maxHeight / aspectRatio, height: maxHeight };
  }

  return { width: maxWidth, height: maxWidth * aspectRatio };
}

export function YoutubeVideo({
  videoId,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  onPlayerStateChange,
  className,
  overlayText,
}: YoutubeVideoProps) {
  const styles = useStyles();
  const [id] = useState(uniqueId);

  const windowSize = useWindowSize();

  const size = useMemo(
    () => getPlayerSize(width, height, windowSize.width, windowSize.height),
    [windowSize, width, height]
  );

  const sizeRef = useRef(size);
  const onStateChange = useRef(onPlayerStateChange || (() => {}));
  useEffect(() => {
    onStateChange.current = onPlayerStateChange || (() => {});
  }, [onPlayerStateChange]);

  const [playerState, setPlayerState] = useState(PlayerState.Initializing);

  const playerOpts = useMemo<PlayerOptions>(
    () => ({
      videoId,
      width: sizeRef.current[0],
      height: sizeRef.current[1],
      playerVars: {
        autoplay: 0,
        playsinline: 1,
        controls: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onStateChange(event) {
          setPlayerState(event.data);
          onStateChange.current(event);
        },
        onReady() {
          setPlayerState(PlayerState.Unstarted);
        },
      },
    }),
    [videoId]
  );

  const player = useYoutubePlayer(id, playerOpts);

  useEffect(() => {
    if (!player) {
      return;
    }

    if (
      sizeRef.current.width !== size.width ||
      sizeRef.current.height !== size.height
    ) {
      sizeRef.current = size;
      player.setSize(size.width, size.height);
    }
  }, [player, size]);

  const showOverlay =
    playerState === PlayerState.Unstarted || playerState === PlayerState.Paused;

  return (
    <div className={cn(styles.root, className)}>
      <div id={id} style={size} className={cn(styles.placeholder)}>
        <SpinnerView />
      </div>
      <div className={cn(styles.overlay, showOverlay && styles.overlayVisible)}>
        {overlayText && (
          <H2
            className={cn(styles.overlayText)}
            dangerouslySetInnerHTML={{ __html: overlayText }}
          />
        )}
      </div>
    </div>
  );
}
