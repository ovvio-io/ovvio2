import { Descendant, Editor } from "slate";
import { createOvvioEditor } from ".";

export function createStaticEditor(value: Descendant[]): Editor {
  const editor = createOvvioEditor();
  editor.children = value;
  return editor;
}