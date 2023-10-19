import React, { useCallback, useEffect } from "react";
import Menu from "../../../../styles/components/menu.tsx";
import { IconOverflow } from "../../../../styles/components/icons/index.ts";
import {
  EditCardAction,
  // UploadAttachmentAction,
  EditDueDateAction,
  ViewInNoteAction,
  DeleteCardAction,
  // ExportMailAction,
  // ExportPdfAction,
  DuplicateCardAction,
  // CopyUrlAction,
  ConvertNoteAction,
} from "./actions/index.tsx";
import { Note } from "../../../../cfds/client/graph/vertices/note.ts";
import { VertexManager } from "../../../../cfds/client/graph/vertex-manager.ts";
import { OvvioEditor } from "../../core/slate/types.ts";
import { UISource } from "../../../../logging/client-events.ts";
import { useLogger } from "../../core/cfds/react/logger.tsx";
import { usePartialVertex } from "../../core/cfds/react/vertex.ts";
import { IconMore } from "../../../../styles/components/new-icons/icon-more.tsx";
import { makeStyles } from "../../../../styles/css-objects/index.ts";
import { styleguide } from "../../../../styles/styleguide.ts";
import { notFound } from "../../../../cfds/base/errors.ts";

const useStyles = makeStyles(() => ({
  itemMenu: {
    opacity: 0,
    ...styleguide.transition.short,
    transitionProperty: "opacity",
    marginRight: styleguide.gridbase,
  },
  itemMenuOpen: {
    opacity: 1,
    padding: "0px 6px 0px 0px",
  },
}));

export interface CardMenuViewProps {
  cardManager: VertexManager<Note>;
  allowsEdit?: boolean;
  onDeleted?: () => void;
  className?: any;
  source: UISource;
  editorRootKey?: string;
  direction?: "in" | "out";
  position?: "top" | "bottom" | "left" | "right";
  editor?: OvvioEditor;
  visible?: boolean;
}

export default function CardMenuView({
  cardManager,
  allowsEdit,
  onDeleted,
  className,
  source,
  editorRootKey,
  direction,
  position,
  editor,
  visible,
}: CardMenuViewProps) {
  const logger = useLogger();
  const styles = useStyles();

  const partialNote = usePartialVertex(cardManager, ["parentNote"]);
  if (!cardManager) {
    return null;
  }

  const renderButton = useCallback(
    (
      { isOpen } //TODO: fix this.
    ) => (
      <div
        className={!isOpen && visible ? styles.itemMenu : styles.itemMenuOpen}
      >
        <IconMore />
      </div>
    ),
    [styles]
  );

  // useEffect(()=> {
  //   if()
  // })
  return (
    <Menu
      renderButton={renderButton}
      direction="out"
      position="left"
      align="start"
    >
      {allowsEdit && (
        <EditCardAction
          cardManager={cardManager}
          source={source}
          editor={editor}
        />
      )}
      <EditDueDateAction cardManager={cardManager} source={source} />

      {/* <UploadAttachmentAction cardManager={cardManager} source={source} /> */}
      {partialNote.parentNote && (
        <ViewInNoteAction cardManager={cardManager} source={source} />
      )}
      <DuplicateCardAction
        cardManager={cardManager}
        source={source}
        editorRootKey={editorRootKey}
        editor={editor}
      />
      {/* <ExportMailAction cardManager={cardManager} source={source} />
      <ExportPdfAction cardManager={cardManager} source={source} /> */}
      <ConvertNoteAction cardManager={cardManager} source={source} />
      <DeleteCardAction
        cardManager={cardManager}
        source={source}
        onDeleted={onDeleted}
      />
      {/* <CopyUrlAction cardManager={cardManager} source={source} /> */}
    </Menu>
  );
}
