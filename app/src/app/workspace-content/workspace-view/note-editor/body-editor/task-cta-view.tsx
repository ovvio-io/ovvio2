import React from 'react';
import { Editor, Node } from 'slate';
import { useSlate } from 'slate-react';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import { ElementUtils } from '../../../../../core/slate/utils/element-utils.ts';
import { CardElement } from '../../../../../core/slate/elements/card.element/index.tsx';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import localization from './body-editor.strings.json' assert { type: 'json' };

const useStyles = makeStyles((theme) => ({
  placeholder: {
    marginTop: styleguide.gridbase,
    height: styleguide.gridbase * 3,
    lineHeight: `${styleguide.gridbase * 3}px `,
    color: 'rgba(17, 8, 43, 0.3)',
    userSelect: 'none',
  },
}));

const useStrings = createUseStrings(localization);

function shouldShowPlaceholder(editor: Editor) {
  if (editor.children.length === 1 && !Node.string(editor)) {
    return false;
  }

  const [node] = ElementUtils.findNode(editor, CardElement.isCard);
  return !node;
}

interface TaskCtaProps {
  onClick?: () => void;
}

export default function TaskCtaView({ onClick = () => {} }: TaskCtaProps) {
  const styles = useStyles();
  const editor = useSlate();
  const strings = useStrings();

  if (!shouldShowPlaceholder(editor)) {
    return null;
  }

  return (
    <div className={cn(styles.placeholder)} onClick={onClick}>
      <Text>{strings.createTaskCta}</Text>
    </div>
  );
}
