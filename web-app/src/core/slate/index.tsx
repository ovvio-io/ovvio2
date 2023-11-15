import { Note } from '../../../../cfds/client/graph/vertices/note.ts';
import { useCfdsContext } from '../cfds/react/graph.tsx';
import { useEffect, useMemo, useRef } from 'react';
import { createEditor, Editor } from 'slate';
import { RenderElementProps, withReact } from 'slate-react';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { useCfdsEditor, EditorHandler } from './cfds/use-cfds-editor.ts';
import withCfds from './cfds/with-cfds.tsx';
import { createBulletListPlugin } from './elements/bullet-list.element.tsx';
import { createCardPlugin } from './elements/card.element/index.tsx';
import { withCards } from './elements/card.element/with-cards.ts';
import { createHeaderPlugin } from './elements/header.element.tsx';
import { createHeader2Plugin } from './elements/header2.element.tsx';
import { createListItemPlugin } from './elements/list-item.element.tsx';
import { createNumberedListPlugin } from './elements/numbered-list.element.tsx';
import { withMentions } from './mentions/index.tsx';
import { createTagsPlugin } from './mentions/tags.tsx';
import { createPluginStack, PluginStack } from './plugins/index.ts';
import {
  createBaseBodyPlugin,
  createBaseRender,
  createBaseTitlePlugin,
} from './plugins/base.tsx';
import { createAssigneesPlugin } from './mentions/assignees.tsx';
import { useCurrentUser } from '../cfds/react/vertex.ts';
import { isDefined } from '../../../../base/comparisons.ts';
import { createLinkDecoration } from './plugins/link-decoration/index.tsx';
import { useLogger } from '../cfds/react/logger.tsx';
import { UISource } from '../../../../logging/client-events.ts';
import { useTrustPool } from '../../../../auth/react.tsx';

export function createOvvioEditor(getNote?: () => VertexManager<Note>): Editor {
  return withCfds(withCards(withReact(withMentions(createEditor())), getNote));
}

export function useBodyEditor(noteManager: VertexManager<Note>): {
  editor: Editor;
  plugins: PluginStack;
  handlers: EditorHandler;
} {
  const noteManagerRef = useRef(noteManager);
  const sessionId = useTrustPool().currentSession.id;
  const currentUser = useCurrentUser();
  const editor = useMemo(
    () => createOvvioEditor(() => noteManagerRef.current),
    []
  );
  const logger = useLogger();

  useEffect(() => {
    noteManagerRef.current = noteManager;
  }, [noteManager]);

  const plugins = useMemo(
    () =>
      createPluginStack([
        createBaseRender(editor),
        createHeader2Plugin(editor),
        createHeaderPlugin(editor),
        createListItemPlugin(editor),
        createBulletListPlugin(editor),
        createNumberedListPlugin(editor),
        createCardPlugin(
          editor,
          () => noteManager,
          () => currentUser,
          logger
        ),
        createLinkDecoration(),
        createBaseBodyPlugin(editor),
      ]),
    [editor, logger, currentUser, noteManager]
  );
  const handlers = useCfdsEditor(
    noteManager,
    'body',
    editor,
    `${currentUser.key}/${sessionId}`,
    { undoAddBodyRefs: true }
  );

  return {
    editor,
    plugins,
    handlers,
  };
}

const noop = () => {};

export interface UseTitleEditorOptions {
  onFocusNext: () => void;
}

const DEFAULT_OPTS: UseTitleEditorOptions = {
  onFocusNext: noop,
};

export function useTitleEditor(
  note: VertexManager<Note>,
  DefaultComponent: React.ReactNode | React.ComponentType<RenderElementProps>,
  source?: UISource,
  opts: Partial<UseTitleEditorOptions> = {}
): {
  editor: Editor;
  plugins: PluginStack;
  handlers: EditorHandler;
  source?: UISource;
} {
  const { onFocusNext } = {
    ...DEFAULT_OPTS,
    ...opts,
  };
  const sessionId = useTrustPool().currentSession.id;
  const user = useCurrentUser();
  const noteRef = useRef(note);
  useEffect(() => {
    noteRef.current = note;
  }, [note]);
  const editor = useMemo(() => createOvvioEditor(() => noteRef.current), []);

  const plugins = useMemo(
    () =>
      createPluginStack(
        [
          !source || source !== 'list'
            ? createTagsPlugin({
                canOpen: () => true,
                editor,
              })
            : undefined,
          !source || source !== 'list'
            ? createAssigneesPlugin({
                canOpen: () => true,
                editor,
              })
            : undefined,
          createBaseTitlePlugin(editor, DefaultComponent, onFocusNext),
        ].filter(isDefined)
      ),
    [editor, source, DefaultComponent, onFocusNext]
  );
  const handlers = useCfdsEditor(
    note,
    'title',
    editor,
    `${user.key}/${sessionId}`
  );

  return {
    editor,
    plugins,
    handlers,
  };
}
