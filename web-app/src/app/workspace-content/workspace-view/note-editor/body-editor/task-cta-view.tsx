import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { Text } from '@ovvio/styles/lib/components/texts';
import { styleguide } from '@ovvio/styles/lib';
import { ElementUtils } from 'core/slate/utils/element-utils';
import { CardElement } from 'core/slate/elements/card.element';
import { useSlate } from 'slate-react';
import { Editor, Node } from 'slate';
import { createUseStrings } from 'core/localization';
import localization from './body-editor.strings.json';

const useStyles = makeStyles(theme => ({
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
