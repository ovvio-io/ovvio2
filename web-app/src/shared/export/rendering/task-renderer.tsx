import React from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide } from '@ovvio/styles/lib';
import dueDateImage from './due-date.png';
import { Note, Tag } from '@ovvio/cfds/lib/client/graph/vertices';
import { Renderer, RenderProps } from './types';
import { isRefMarker, RefType } from '@ovvio/cfds/lib/richtext/model';
import { findFirstTextNode } from '@ovvio/cfds/lib/richtext/utils';

const styles = makeStyles(
  theme => ({
    task: {
      width: '100%',
      boxSizing: 'border-box',
      padding: styleguide.gridbase * 2,
      color: theme.background.text,
      fontSize: 12,
      lineHeight: 1.83,
      border: 'solid 0.7px #9cb2cd',
      marginBottom: styleguide.gridbase,
      borderRadius: 2.8,
    },
    tagList: {
      marginBottom: styleguide.gridbase,
    },
    tag: {
      display: 'inline-block',
      paddingLeft: styleguide.gridbase,
      paddingRight: styleguide.gridbase,
      height: styleguide.gridbase * 3,
      lineHeight: `${styleguide.gridbase * 3}px`,
      fontSize: 12,
      borderRadius: styleguide.gridbase * 1.5,
      marginRight: styleguide.gridbase,
    },
    pill: {
      marginTop: styleguide.gridbase,
      display: 'inline-block',
      height: styleguide.gridbase * 4,
      borderRadius: styleguide.gridbase * 2,
      padding: [0, styleguide.gridbase],
      boxSizing: 'border-box',
      border: 'solid 1px rgba(156, 178, 205, 0.5)',
      ':not(:first-child)': {
        marginLeft: styleguide.gridbase,
      },
    },
    pillText: {
      verticalAlign: 'top',
      fontSize: styleguide.gridbase * 1.5,
      lineHeight: `${styleguide.gridbase * 3.75}px`,
      color: '#9cb2cd',
    },
    pillImageContainer: {
      display: 'inline-block',
      position: 'relative',
      height: '100%',
      width: styleguide.gridbase * 2.25,
      marginRight: styleguide.gridbase * 0.5,
    },
    pillImage: {
      position: 'absolute',
      height: styleguide.gridbase * 2.25,
      width: styleguide.gridbase * 2.25,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    },
  }),
  'taskpdf'
);

interface DatePillProps {
  date: Date;
}
function DatePill({ date }: DatePillProps) {
  return (
    <div className={cn(styles.pill)}>
      <div className={cn(styles.pillImageContainer)}>
        <img
          className={cn(styles.pillImage)}
          alt="due date"
          src={dueDateImage}
          width="18"
          height="18"
        />
      </div>
      <span className={cn(styles.pillText)}>{date.toLocaleDateString()}</span>
    </div>
  );
}

function makeTransparent(color) {
  color = color.split('#').join('');
  const r = parseInt(color[0] + color[1], 16);
  const g = parseInt(color[2] + color[3], 16);
  const b = parseInt(color[4] + color[5], 16);
  return `rgba(${r}, ${g}, ${b}, 0.2)`;
}

export default class TaskRenderer implements Renderer {
  css() {
    return styles.getCss();
  }

  renderPlainText({ node, graph }: RenderProps, next: () => any) {
    if (isRefMarker(node) && node.type === RefType.InternalDoc) {
      const task = graph.getVertex<Note>(node.ref);

      const tags = this._getTags(task);

      const dueDate = task.dueDate;
      const content = findFirstTextNode(task.title)?.text || '';

      const dueDateStr = dueDate ? ` - ${dueDate.toLocaleDateString()}` : '';
      const tagsStr = tags.map(x => x.text).join(' ');
      return `- ${content.split('\n').join('')} ${tagsStr}${dueDateStr}\n`;
    }

    return next();
  }

  renderNode(
    { node, workspace, graph, attributes }: RenderProps,
    next: () => any
  ) {
    if (isRefMarker(node) && node.type === RefType.InternalDoc) {
      const task = graph.getVertex<Note>(node.ref);

      const tags = this._getTags(task);
      const dueDate = task.dueDate;
      const content = findFirstTextNode(task.title)?.text || '';

      return (
        <div className={cn(styles.task)} {...attributes}>
          {tags.length ? (
            <div className={cn(styles.tagList)}>
              {tags.map(t => {
                const style = {
                  backgroundColor: makeTransparent(t.parent.color),
                  color: t.parent.color,
                };
                return (
                  <div
                    className={cn(styles.tag)}
                    style={style}
                    key={t.parent.key}
                  >
                    {t.text}
                  </div>
                );
              })}
            </div>
          ) : null}
          {/* {
            this._renderer.renderHtml(task.get('title'), cfdsClient, workspace)
              .content
          } */}
          {content}
          <div>{dueDate && <DatePill date={dueDate} />}</div>
        </div>
        //className={cn(styles.footer)} NO FOOTER STYLE
      );
    }

    return next();
  }

  private _getTags(task: Note): {
    parent: Tag;
    child?: Tag;
    text: string;
  }[] {
    const tags: {
      parent: Tag;
      child?: Tag;
      text: string;
    }[] = [];

    for (const [pTag, cTag] of task.tags) {
      let child: Tag | undefined;

      if (pTag !== cTag) {
        child = cTag;
      }

      tags.push({
        parent: pTag,
        child,
        text: `${pTag.name}${child ? '/' + child.name : ''}`,
      });
    }
    return tags;
  }
}
