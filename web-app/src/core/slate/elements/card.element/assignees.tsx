import React from 'react';
import { createMentionsPlugin } from "core/slate/mentions";
import { Editor } from "slate";
import { MentionSuggestionsProps } from 'core/slate/mentions/mention-node';
import { CardElement } from '.';

// function AssigneesComponent({ filter, selectedIndex, setLength }: MentionSuggestionsProps) {
//   return null
// }

export function createAssigneesPlugin(editor: Editor) {
  // return createMentionsPlugin({
  //   trigger: '@',
  //   editor,
  //   canOpen: () => CardElement.isSingleCard(editor),
  //   SuggestionComponent: AssigneesComponent
  // });
}