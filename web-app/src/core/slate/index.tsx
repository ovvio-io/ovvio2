import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { useCfdsContext } from 'core/cfds/react/graph';
import { useEffect, useMemo, useRef } from 'react';
import { createEditor, Editor } from 'slate';
import { withReact } from 'slate-react';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { useCfdsEditor, EditorHandler } from './cfds/use-cfds-editor';
import withCfds from './cfds/with-cfds';
import { createBulletListPlugin } from './elements/bullet-list.element';
import { createCardPlugin } from './elements/card.element';
import { withCards } from './elements/card.element/with-cards';
import { createHeaderPlugin } from './elements/header.element';
import { createHeader2Plugin } from './elements/header2.element';
import { createListItemPlugin } from './elements/list-item.element';
import { createNumberedListPlugin } from './elements/numbered-list.element';
import { withMentions } from './mentions';
import { createTagsPlugin } from './mentions/tags';
import { createPluginStack, PluginStack } from './plugins';
import {
  createBaseBodyPlugin,
  createBaseRender,
  createBaseTitlePlugin,
} from './plugins/base';
import { createAssigneesPlugin } from './mentions/assignees';
import { useCurrentUser } from 'core/cfds/react/vertex';
import { CARD_SOURCE } from '../../shared/card';
import { isDefined } from '@ovvio/base/lib/utils';
import { useEventLogger } from '../analytics';
import { createLinkDecoration } from './plugins/link-decoration';

export function createOvvioEditor(getNote?: () => VertexManager<Note>): Editor {
  return withCfds(withCards(withReact(withMentions(createEditor())), getNote));
}

export function useBodyEditor(noteManager: VertexManager<Note>): {
  editor: Editor;
  plugins: PluginStack;
  handlers: EditorHandler;
} {
  const { sessionId, user } = useCfdsContext();
  const noteManagerRef = useRef(noteManager);
  const currentUser = useCurrentUser();
  const userRef = useRef(currentUser);
  const editor = useMemo(
    () => createOvvioEditor(() => noteManagerRef.current),
    []
  );
  const eventLogger = useEventLogger();

  useEffect(() => {
    noteManagerRef.current = noteManager;
  }, [noteManager]);

  useEffect(() => {
    userRef.current = currentUser;
  }, [currentUser]);
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
          () => noteManagerRef.current,
          () => userRef.current,
          eventLogger
        ),
        createLinkDecoration(),
        createBaseBodyPlugin(editor),
      ]),
    [editor, eventLogger]
  );
  const handlers = useCfdsEditor(
    noteManager,
    'body',
    editor,
    `${user.id}/${sessionId}`,
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
  DefaultComponent: any,
  source?: CARD_SOURCE,
  opts: Partial<UseTitleEditorOptions> = {}
): {
  editor: Editor;
  plugins: PluginStack;
  handlers: EditorHandler;
  source?: CARD_SOURCE;
} {
  const { onFocusNext } = {
    ...DEFAULT_OPTS,
    ...opts,
  };
  const { sessionId, user } = useCfdsContext();
  const noteRef = useRef(note);
  useEffect(() => {
    noteRef.current = note;
  }, [note]);
  const editor = useMemo(() => createOvvioEditor(() => noteRef.current), []);

  const plugins = useMemo(
    () =>
      createPluginStack(
        [
          !source || source !== CARD_SOURCE.LIST
            ? createTagsPlugin({
                canOpen: () => true,
                editor,
              })
            : undefined,
          !source || source !== CARD_SOURCE.LIST
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
    `${user.id}/${sessionId}`
  );

  return {
    editor,
    plugins,
    handlers,
  };
}
