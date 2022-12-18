import { Note } from '../../../../cfds/client/graph/vertices/note.ts';
import { useCfdsContext } from '../cfds/react/graph.tsx';
import { useEffect, useMemo, useRef } from 'https://esm.sh/react@18.2.0';
import { createEditor, Editor } from 'https://esm.sh/slate@0.87.0';
import { withReact } from 'https://esm.sh/slate-react@0.87.1';
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
import { CARD_SOURCE } from '../../shared/card/index.tsx';
import { isDefined } from '../../../../base/comparisons.ts';
import { createLinkDecoration } from './plugins/link-decoration/index.tsx';
import { useLogger } from '../cfds/react/logger.tsx';

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
  const logger = useLogger();

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
          logger
        ),
        createLinkDecoration(),
        createBaseBodyPlugin(editor),
      ]),
    [editor, logger]
  );
  const handlers = useCfdsEditor(
    noteManager,
    'body',
    editor,
    `${user?.id || 'anonymous'}/${sessionId}`,
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
  DefaultComponent: React.ReactNode,
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
    `${user?.id || 'anonymous'}/${sessionId}`
  );

  return {
    editor,
    plugins,
    handlers,
  };
}
