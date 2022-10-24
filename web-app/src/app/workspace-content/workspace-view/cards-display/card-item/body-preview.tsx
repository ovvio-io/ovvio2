import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { useWindowSize } from 'core/react-utils';
import { useLayoutEffect, useRef, useState } from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';

const lineHeight = 18;

const useStyles = makeStyles(theme => ({
  container: {
    maxHeight: lineHeight * 2,
    overflowY: 'hidden',
  },
  text: {
    display: 'block',
    lineHeight: `${lineHeight}px`,
    fontWeight: '400',
    fontSize: 13,
    color: theme.background.text,
  },
  overflowing: {
    position: 'relative',
    ':after': {
      position: 'absolute',
      bottom: 0,
      top: 0,
      left: 0,
      right: 0,
      content: '""',
      background: `linear-gradient(to top,
        rgba(255,255,255, 0.8) 0%, 
        rgba(255,255,255, 0.1) 100%
     )`,
      pointerEvents: 'none',
    },
  },
}));

export interface BodyPreviewProps {
  card: VertexManager<Note>;
  className?: string;
}

function escapeHtml(text: string): string {
  const textNode = document.createTextNode(text);
  const p = document.createElement('p');
  p.appendChild(textNode);

  return p.innerHTML;
}

export function BodyPreview({ card, className }: BodyPreviewProps) {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement>();
  const textRef = useRef<HTMLDivElement>();

  // const { body } = usePartialVertex(card, ['body']);
  // const value = body.root.children as Descendant[];
  // const text = value.map(node => escapeHtml(Node.string(node))).join('<br>');
  const { bodyPreview } = usePartialVertex(card, ['bodyPreview']);
  const text = escapeHtml(bodyPreview);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const { height } = useWindowSize();
  useLayoutEffect(() => {
    if (!containerRef.current || !textRef.current) {
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const textRect = textRef.current.getBoundingClientRect();
    setIsOverflowing(containerRect.height < textRect.height);
  }, [height]);

  if (!text) {
    return null;
  }

  return (
    <div
      className={cn(
        styles.container,
        isOverflowing && styles.overflowing,
        className
      )}
      ref={containerRef}
    >
      <div
        className={cn(styles.text)}
        ref={textRef}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </div>
  );
}
