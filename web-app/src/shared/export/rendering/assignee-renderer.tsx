import React from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { Renderer, RenderProps } from './types';
import { isRefMarker, RefType } from '@ovvio/cfds/lib/richtext/model';

const styles = makeStyles(
  theme => ({
    assignee: {
      fontSize: 12,
    },
  }),
  'pdf'
);
const COLORS = ['#1995d1', '#00c7d6', '#da9f43', '#dd2e9a', '#fe4a62'];

export default class AssigneeRenderer implements Renderer {
  css() {
    return styles.getCss();
  }

  renderPlainText({ node, workspace }: RenderProps, next: () => any) {
    if (isRefMarker(node) && node.type === RefType.Link) {
      const userId = node.ref;

      for (const user of workspace.users) {
        if (user.key === userId) {
          return `@${user.name || user.email}`;
        }
      }

      //user not found
      return '';
    }
    return next();
  }

  renderNode({ node, workspace }: RenderProps, next: () => any) {
    if (isRefMarker(node) && node.type === RefType.Link) {
      const userId = node.ref;

      const wsUsers = Array.from(workspace.users);
      for (let i = 0; i < wsUsers.length; i++) {
        const user = wsUsers[i];
        if (user.key === userId) {
          const color = COLORS[i % COLORS.length];
          return (
            <span className={cn(styles.assignee)} style={{ color: color }}>
              @{user.name || user.email}
            </span>
          );
        }
      }

      return null;
    }
    return next();
  }
}
