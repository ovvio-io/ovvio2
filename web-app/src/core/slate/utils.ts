import { Descendant, Editor } from 'slate';
import { createOvvioEditor } from './index.tsx';

export function createStaticEditor(value: Descendant[]): Editor {
  const editor = createOvvioEditor();
  editor.children = value;
  return editor;
}
