import React from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide } from '@ovvio/styles/lib';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { lightTheme } from '@ovvio/styles/lib/theme';

const styles = makeStyles(
  theme => ({
    workspaceInfo: {
      borderTop: `1px solid rgba(13, 0, 72, 0.2)`,
      position: 'fixed',
      top: '100%',
      width: '100%',
      height: styleguide.gridbase * 4,
    },
    watermark: {
      color: '#11082b',
      fontSize: 8,
      position: 'running(watermark)',
      height: 8,
      textAlign: 'right',
      verticalAlign: 'bottom',
    },
    link: {
      color: lightTheme.primary[400],
    },
  }),
  'pdfFooter'
);
export const footerCss = styles.getCss();

const dateOpts: any = {
  dateStyle: 'medium',
};
const MACROS = {
  DATE: () => new Date().toLocaleString(undefined, dateOpts),
  DATE_DIGITS() {
    const now = new Date();
    const days = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();
    return `${days}/${month + 1}/${year}`;
  },
};

interface NoteFooterProps {
  workspace: Workspace;
  dir: 'ltr' | 'rtl';
}
export function NoteFooter({ workspace, dir }: NoteFooterProps) {
  const footerHtmlRaw = (workspace.footerHtml || '').split('%DIR%').join(dir);

  const footerHtml = Object.entries(MACROS).reduce(
    (footer, [macroName, fn]) => {
      const val = fn();
      return footer.split(`%${macroName}%`).join(val);
    },
    footerHtmlRaw
  );

  return (
    <React.Fragment>
      <div
        className={cn(styles.workspaceInfo)}
        dir={dir}
        dangerouslySetInnerHTML={{
          __html: footerHtml,
        }}
      />
      <div className={cn(styles.watermark)}>
        <span>
          Powered by{' '}
          <a className={cn(styles.link)} href="https://app.ovvio.io">
            Ovvio.io
          </a>
        </span>
      </div>
    </React.Fragment>
  );
}
