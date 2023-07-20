import { Descendant, Editor } from 'https://esm.sh/slate@0.87.0';
import { createOvvioEditor } from './index.tsx';

export function createStaticEditor(value: Descendant[]): Editor {
  const editor = createOvvioEditor();
  editor.children = value;
  return editor;
}
