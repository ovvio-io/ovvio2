import React from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide } from '@ovvio/styles/lib';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';

const styles = makeStyles(
  theme => ({
    header: {
      height: styleguide.gridbase * 12,
      position: 'relative',
    },
    workspaceName: {
      margin: 0,
      marginBottom: styleguide.gridbase,
      fontSize: 32,
      fontWeight: 'normal',
    },
    logo: {
      height: styleguide.gridbase * 12,
      width: styleguide.gridbase * 12,
      position: 'absolute',
      top: 0,
      '& img': {
        height: styleguide.gridbase * 12,
        width: styleguide.gridbase * 12,
      },
    },
    logoLtr: {
      right: 0,
    },
    logoRtl: {
      left: 0,
    },
  }),
  'pdf'
);

export const headerCss = styles.getCss();

interface NoteHeaderProps {
  children: any;
  workspace: Workspace;
  dir: 'ltr' | 'rtl';
}
export function NoteHeader({ children, workspace, dir }: NoteHeaderProps) {
  return (
    <div className={cn(styles.header)}>
      <h1 className={cn(styles.workspaceName)}>{workspace.name}</h1>
      {children}
      <div
        className={cn(
          styles.logo,
          dir === 'rtl' ? styles.logoRtl : styles.logoLtr
        )}
      >
        {workspace.exportImage ? (
          <img
            alt="logo"
            src={workspace.exportImage}
            height={styleguide.gridbase * 12}
            width={styleguide.gridbase * 12}
          />
        ) : null}
      </div>
    </div>
  );
}
