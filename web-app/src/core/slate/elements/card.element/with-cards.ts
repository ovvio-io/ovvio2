import { duplicateCard } from '@ovvio/cfds/lib/client/duplicate';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices/note';
import { initRichText } from '@ovvio/cfds/lib/richtext/tree';
import { createNewCard } from 'shared/card/create';
import { Editor, Node, Path, Transforms } from 'slate';
import { CardElement } from '.';

export function withCards(
  editor: Editor,
  getNote?: () => VertexManager<Note>
): Editor {
  const { insertFragment, normalizeNode } = editor;

  editor.insertFragment = (fragment: Node[]) => {
    const sanitized = fragment.map(node => {
      if (CardElement.isCard(node)) {
        // If pasting from a different account / stage then the graph won't
        // have the target vertex. In this case we strip the task to its
        // contents.
        const noteMgr = getNote && getNote();
        if (noteMgr !== undefined && noteMgr.graph.hasVertex(node.ref)) {
          // First, try to duplicate the inner task including its subtasks
          let duplicatedTask = duplicateCard(noteMgr.graph, node.ref, {
            suffix: '',
          });
          // Duplicate will fail if not all subtasks are accessible. If this
          // happens, our next best effort is to duplicate the subtask without
          // its inner tasks
          if (duplicatedTask === undefined) {
            duplicatedTask = createNewCard(
              noteMgr.graph,
              noteMgr.getVertexProxy().workspace,
              {
                ...noteMgr.graph.getVertex<Note>(node.ref).record.cloneData(),
                body: initRichText(),
              }
            );
          }
          // If we've managed to create a duplicate, replace the ref's key
          if (duplicatedTask !== undefined) {
            node.ref = duplicatedTask.key;
          } else {
            // Failed to create a duplicate. We have no choice but to strip
            // the ref and keep its only its contents (task title)
            node = node.children[0];
          }
        } else {
          // We're dealing with a task that's not available in our graph.
          // Strip it away and keep only its contents
          node = node.children[0];
        }
      }
      return node;
    });
    insertFragment(sanitized);
  };

  editor.normalizeNode = entry => {
    const [node, path] = entry;

    if (
      CardElement.isCard(node) &&
      Path.equals(path, [editor.children.length - 1])
    ) {
      Transforms.insertNodes(
        editor,
        {
          tagName: 'p',
          children: [{ text: '' }],
        },
        { at: [editor.children.length] }
      );
      return;
    }

    normalizeNode(entry);
  };

  return editor;
}
