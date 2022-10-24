import { isMention } from 'core/slate/mentions';
import { FormattedText } from 'core/slate/types';
import { MouseEvent, useCallback, useRef, useState } from 'react';
import { RenderLeafProps } from 'slate-react';
import { styleguide, layout } from '@ovvio/styles/lib';
import { IconLink } from '@ovvio/styles/lib/components/icons';
import Popper from '@ovvio/styles/lib/components/popper';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';

const useStyles = makeStyles(theme => ({
  anchor: {
    color: '-webkit-link',
    textDecoration: 'underline',
  },
  button: {
    marginLeft: styleguide.gridbase,
    backgroundColor: theme.background[0],
    borderRadius: 4,
    height: styleguide.gridbase * 3,
    width: styleguide.gridbase * 3,
    userSelect: 'none',
    boxShadow: '0 3px 5px 0 rgba(42, 62, 82, 0.12)',
    basedOn: [layout.column, layout.centerCenter],
  },
  icon: {
    transform: 'scale(1.5)',
    transformOrigin: 'center center',
  },
}));

interface LinkText extends FormattedText {
  link: string;
}

export interface LinkLeafProps extends RenderLeafProps {
  leaf: LinkText;
}

export function isLinkLeafProps(
  props: RenderLeafProps
): props is LinkLeafProps {
  const { leaf } = props;
  return !isMention(leaf) && !!leaf.link;
}

export function LinkLeaf({ leaf, children, attributes }: LinkLeafProps) {
  const styles = useStyles();
  const ref = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const onMouseEnter = useCallback(() => setIsOpen(true), []);
  const onMouseLeave = useCallback(() => setIsOpen(false), []);
  const onClick = useCallback((e: MouseEvent) => e.stopPropagation(), []);

  const { link } = leaf;

  return (
    <span
      {...attributes}
      ref={ref}
      className={cn(styles.anchor)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
      <Popper
        open={isOpen}
        anchor={ref.current}
        contentEditable={false}
        position="right"
        direction="out"
      >
        <a
          className={cn(styles.button)}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
        >
          <IconLink fill="#9CB2CD" className={cn(styles.icon)} />
        </a>
      </Popper>
    </span>
  );
}
