import React from 'react';
import ReactDOMServer from 'react-dom/server';
import config from 'core/config';
import { noteBodyRenderer, noteTitleRenderer } from './rendering';
import { NoteHeader, headerCss } from './note-header';
import { NoteFooter, footerCss } from './footer';
import { isRTL } from 'core/richtext/rtl';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { findFirstTextNode } from '@ovvio/cfds/lib/richtext/utils';

function renderNote(card: Note) {
  const str = findFirstTextNode(card.title)?.text || '';

  const dir = isRTL(str) ? 'rtl' : 'ltr';
  const noteBody = noteBodyRenderer.renderHtml(
    card.getRawBody(),
    card.graph,
    card.workspace
  );
  const noteTitle = noteTitleRenderer.renderHtml(
    card.title,
    card.graph,
    card.workspace
  );

  return ReactDOMServer.renderToStaticMarkup(
    <html dir={dir}>
      <head>
        <link
          href="https://fonts.googleapis.com/css?family=Source+Sans+Pro"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css?family=Heebo|Montserrat:700|Roboto:300,400,500,700&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `html, body {
            margin: 0;
            padding: 0;
            font-family: 'Roboto', 'Heebo', sans-serif;
          }
          @page {
            size: A4 portrait;
            margin-top: 32px;
            margin-left: 32px;
            margin-right: 32px;
            margin-bottom: 96px;
            @bottom-left {
              content: "Page " counter(page) " of " counter(pages);
              color: #11082b;
              font-size: 8px;
              line-height: 8px;
            }
            @bottom-right {
              content: element(watermark);
            }
          }`,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: [
              headerCss,
              footerCss,
              noteTitle.style,
              noteBody.style,
            ].join('\n\n'),
          }}
        />
      </head>
      <body dir={dir}>
        <NoteFooter workspace={card.workspace} dir={dir} />

        <NoteHeader workspace={card.workspace} dir={dir}>
          {noteTitle.content}
        </NoteHeader>

        <div className="note-body">{noteBody.content}</div>
      </body>
    </html>
  );
}

export function downloadBlob(blob: any, filename: string) {
  const uri = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.download = filename;
  a.href = uri;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(uri);
}

export function generatePlainText(card: Note) {
  const title = findFirstTextNode(card.title)?.text || '';

  const body = noteBodyRenderer.renderPlainText(
    card.getRawBody(),
    card.graph,
    card.workspace
  );
  return {
    title,
    body,
  };
}

export function generateMailtoLink(card: Note) {
  const { title, body } = generatePlainText(card);
  const escapedBody = encodeURIComponent(body);
  const escapedTitle = encodeURIComponent(title);

  return `mailto://?subject=${escapedTitle}&body=${escapedBody}`;
}

export async function generatePdf(card: Note) {
  const html = renderNote(card);

  const title = findFirstTextNode(card.title)?.text || '';
  const filename = `${title}.pdf`;
  const resp = await fetch(config.pdfServer, {
    method: 'POST',
    mode: 'cors',
    referrerPolicy: 'no-referrer',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      html,
    }),
  });

  const blob = await resp.blob();
  return {
    blob,
    filename,
  };
}
