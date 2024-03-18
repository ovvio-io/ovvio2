import React, { useCallback, useRef } from 'react';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { Tag } from '../../../../cfds/client/graph/vertices/index.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import { IconDropDownArrow } from '../../../../styles/components/icons/index.ts';
import DropDown, {
  DropDownItem,
} from '../../../../styles/components/inputs/drop-down.tsx';
import { useTypographyStyles } from '../../../../styles/components/typography.tsx';
import {
  cn,
  keyframes,
  makeStyles,
} from '../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../styles/theme.tsx';
import {
  usePartialVertex,
  usePartialVertices,
} from '../../core/cfds/react/vertex.ts';
import { useAnimateWidth } from '../../core/react-utils/animate.ts';
import { AddTagMultiButton } from '../../app/settings/components/settings-buttons.tsx';
import { LineSeparator } from '../../../../styles/components/menu.tsx';

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
    minWidth: styleguide.gridbase * 3,
    padding: [0, styleguide.gridbase * 0.5],
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
    marginLeft: styleguide.gridbase * 0.5,
    marginRight: styleguide.gridbase / 2,
    color: theme.colors.text,
    animation: `${showAnim} ${styleguide.transition.duration.short}ms linear backwards`,
    userSelect: 'none',
    basedOn: [useTypographyStyles.textSmall],
  },
  tagDropDownName: {
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
  itemWidth: {
    minWidth: '150px',
  },
}));

interface TagPillViewProps {
  tagMng?: VertexManager<Tag>;
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
  const tagName = partialTag ? partialTag.name : '...';
  const menuOnHover = showMenu === 'hover';
  if (menuOnHover) {
    style = NOOP_STYLE;
  }

  return (
    <div
      ref={ref}
      className={cn(
        className,
        styles.tag,
        !menuOnHover && showMenu && (styles as any).hover,
        menuOnHover && styles.onHover
      )}
      style={{
        ...style,
      }}
    >
      <div className={cn(styles.tagName)}>{tagName}</div>
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
  showMenu = true,
  renderSelected,
}: PillViewProps) {
  const styles = useStyles();
  const partialTag = usePartialVertex(tag, ['parentTag']);
  const partialParentTag = usePartialVertex(partialTag.parentTag?.manager, [
    'childTags',
  ]);
  const siblings = usePartialVertices<Tag>(partialParentTag?.childTags || [], [
    'name',
  ]);
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
      {siblings.map((t) => (
        <DropDownItem value={t} key={t.key} className={styles.itemWidth}>
          <div className={cn(styles.circleContainer)}>
            <div className={cn(styles.circle)} />#
          </div>
          <span className={cn(styles.tagDropDownName)}>{t.name}</span>
        </DropDownItem>
      ))}
      <div style={{ height: '8px' }}></div>
      <DropDownItem value={DELETE_TAG}>
        <div className={cn(styles.circleContainer)}>
          <img src="/icons/design-system/Close.svg" />
        </div>
        <span className={cn(styles.tagDropDownName)}>Remove Tag</span>
      </DropDownItem>
    </DropDown>
  );
}
