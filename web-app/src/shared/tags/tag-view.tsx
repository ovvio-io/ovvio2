import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Tag } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles/lib';
import {
  IconClose,
  IconDropDownArrow,
} from '@ovvio/styles/lib/components/icons';
import DropDown, {
  DropDownItem,
} from '@ovvio/styles/lib/components/inputs/drop-down';
import { useTypographyStyles } from '@ovvio/styles/lib/components/typography';
import { cn, keyframes, makeStyles } from '@ovvio/styles/lib/css-objects';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { useAnimateWidth } from 'core/react-utils/animate';
import React, { useCallback, useRef } from 'react';
const showAnim = keyframes({
  '0%': {
    opacity: 0,
  },
  '99%': {
    opacity: 0,
  },
  '100%': {
    opacity: 1,
  },
});

const useStyles = makeStyles(() => ({
  tag: {
    direction: 'ltr',
    backgroundColor: theme.mono.m1,
    height: styleguide.gridbase * 2,
    minWidth: styleguide.gridbase * 5,
    padding: [0, styleguide.gridbase],
    flexShrink: 0,
    fontSize: 12,
    borderRadius: styleguide.gridbase,
    ...styleguide.transition.short,
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
  },
  tagName: {
    marginLeft: styleguide.gridbase * 0.75,
    marginRight: styleguide.gridbase / 2,
    color: theme.colors.text,
    animation: `${showAnim} ${styleguide.transition.duration.short}ms linear backwards`,
    userSelect: 'none',
    basedOn: [useTypographyStyles.textSmall],
  },
  tagDropDownName: {
    marginLeft: styleguide.gridbase * 0.75,
    marginRight: styleguide.gridbase / 2,
    color: theme.colors.text,
    animation: `${showAnim} ${styleguide.transition.duration.short}ms linear backwards`,
    userSelect: 'none',
    basedOn: [useTypographyStyles.text],
  },
  tagDelete: {
    position: 'relative',
    top: 1,
    animation: `${showAnim} ${styleguide.transition.duration.short}ms backwards linear`,
    cursor: 'pointer',
  },
  onHover: {
    tagDelete: {
      ...styleguide.transition.short,
      transitionProperty: 'width',
      overflow: 'hidden',
      width: 0,
    },
    ':hover': {
      tagDelete: {
        width: styleguide.gridbase * 2,
      },
    },
  },
  hide: {
    display: 'none',
  },
  circleContainer: {
    height: styleguide.gridbase * 4,
    width: styleguide.gridbase * 4,
    basedOn: [layout.column, layout.centerCenter],
  },
  circle: {
    height: styleguide.gridbase,
    width: styleguide.gridbase,
    borderRadius: '50%',
  },
  tagDropName: {
    flexGrow: 1,
    whiteSpace: 'nowrap',
    marginLeft: styleguide.gridbase,
    color: theme.colors.text,
  },
}));

interface TagPillViewProps {
  tagMng: VertexManager<Tag>;
  className?: string;
  showMenu?: boolean | 'hover';
}

const NOOP_STYLE = {};

export function TagPillView({
  tagMng,
  className,
  showMenu = false,
}: TagPillViewProps) {
  const styles = useStyles();
  const partialTag = usePartialVertex(tagMng, ['parentTag', 'name']);

  const ref = useRef<any>();

  let style = useAnimateWidth(ref, showMenu);
  const tagName = partialTag.name;
  const menuOnHover = showMenu === 'hover';
  if (menuOnHover) {
    style = NOOP_STYLE;
  }

  return (
    <div
      ref={ref}
      className={cn(
        styles.tag,
        !menuOnHover && showMenu && (styles as any).hover,
        menuOnHover && styles.onHover,
        className
      )}
      style={{
        ...style,
      }}
    >
      <div className={cn(styles.tagName)}>{tagName}</div>
      <div className={cn(layout.flexSpacer)} />
      <div
        className={cn(
          styles.tagDelete,
          !menuOnHover && !showMenu && styles.hide
        )}
      >
        <IconDropDownArrow className="" />
      </div>
    </div>
  );
}

export interface PillViewProps {
  tag: VertexManager<Tag>;
  className?: string;
  buttonClassName?: string;
  onSelected: (tag: Tag) => void;
  onDelete?: (tag: Tag) => void;
  showMenu?: boolean | 'hover';
  renderSelected?: (tagMng: VertexManager<Tag>) => JSX.Element;
}
// const renderTagItem = props => {
//   return <TagMentionItem {...props} />;
// };

const DELETE_TAG = 'DELETE_TAG';

export default function TagView({
  tag,
  className,
  onSelected,
  buttonClassName,
  onDelete = () => {},
  showMenu = false,
  renderSelected,
}: PillViewProps) {
  const styles = useStyles();
  const partialTag = usePartialVertex(tag, ['workspace', 'parentTag']);
  const partialParent = usePartialVertex(
    partialTag?.parentTag?.manager as VertexManager<Tag>,
    ['childTags']
  );
  const siblings = partialParent?.childTags || [];

  const onChange = (t: Tag | typeof DELETE_TAG) => {
    if (t === DELETE_TAG) {
      onDelete(tag.getVertexProxy());
    } else {
      onSelected(t);
    }
  };
  const renderButton = useCallback(() => {
    if (renderSelected) {
      return renderSelected(tag);
    }
    return (
      <TagPillView tagMng={tag} className={className} showMenu={showMenu} />
    );
  }, [renderSelected, tag, className, showMenu]);

  return (
    <DropDown
      value={tag}
      onChange={onChange}
      className={buttonClassName}
      renderSelected={renderButton}
    >
      {siblings.map(t => (
        <DropDownItem value={t} key={t.key}>
          <div className={cn(styles.circleContainer)}>
            <div
              className={cn(styles.circle)}
              style={{
                backgroundColor: t.color,
              }}
            />
          </div>
          <span className={cn(styles.tagDropDownName)}>{t.name}</span>
        </DropDownItem>
      ))}
      <DropDownItem value={DELETE_TAG}>
        <div className={cn(styles.circleContainer)}>
          <IconClose className="" />
        </div>
        <span className={cn(styles.tagDropDownName)}>Remove Tag</span>
      </DropDownItem>
    </DropDown>
  );
}
