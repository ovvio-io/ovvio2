import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  NoteType,
} from '../../../../../cfds/client/graph/vertices/note.ts';
import { IconDelete } from '../../../../../styles/components/new-icons/icon-delete.tsx';
import { IconDuplicate } from '../../../../../styles/components/new-icons/icon-duplicate.tsx';
import { IconTask } from '../../../../../styles/components/new-icons/icon-task.tsx';
import { IconNote } from '../../../../../styles/components/new-icons/icon-note.tsx';
import { IconViewNote } from '../../../../../styles/components/new-icons/icon-view-note.tsx';
import { IconOpen } from '../../../../../styles/components/new-icons/icon-open.tsx';
import {
  DueDateState,
  IconDueDate,
  IconDueDateProps,
} from '../../../../../styles/components/new-icons/icon-due-date.tsx';
import Menu, {
  LineSeparator,
  MenuAction,
  MenuItem,
} from '../../../../../styles/components/menu.tsx';
import {
  toastContext,
  useToastController,
} from '../../../../../styles/components/toast/index.tsx';
import {
  useGraphManager,
  usePartialGlobalView,
} from '../../../core/cfds/react/graph.tsx';
import { useDocumentRouter } from '../../../core/react-utils/index.ts';
import { useDueDate } from '../../components/due-date-editor/index.tsx';
import {
  usePartialVertex,
  usePartialVertices,
  useVertex,
  useVertices,
} from '../../../core/cfds/react/vertex.ts';
import { useLogger } from '../../../core/cfds/react/logger.tsx';
import { UISource } from '../../../../../logging/client-events.ts';
import { IconAddDueDate } from '../../../../../styles/components/new-icons/icon-add-due-date.tsx';
import {
  IconCheckAllProps,
  IconCheckAll,
  CheckAllState,
} from '../../../../../styles/components/new-icons/icon-check-all.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { layout } from '../../../../../styles/layout.ts';
import { ConfirmationDialog } from '../../../../../styles/components/confirmation-menu.tsx';
import { SecondaryMenuItem } from '../../../../../styles/components/menu.tsx';
import { Workspace } from '../../../../../cfds/client/graph/vertices/workspace.ts';
import { coreValueCompare } from '../../../../../base/core-types/comparable.ts';
import { WorkspaceIndicator } from '../../../../../components/workspace-indicator.tsx';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { SearchBar } from '../../../../../components/search-bar.tsx';
import { useMaxWidth } from '../../../app/index.tsx';
import {
  CopyIntoCardOptions,
  copyIntoCard,
} from '../../../../../cfds/client/duplicate.ts';

const useStyles = makeStyles(() => ({
  itemMenu: {
    opacity: 0,
    ...styleguide.transition.short,
    transitionProperty: 'opacity',
  },
  itemMenuOpen: {
    opacity: 1,
  },
  colorIndicator: {
    marginRight: styleguide.gridbase,
  },
  deleteConfirmation: {
    marginBottom: styleguide.gridbase,
    display: 'flex',
    width: '324px',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '18px',
    background:
      'radial-gradient(130.54% 130.54% at 7.69% 7.69%, rgba(255, 255, 255, 0.30) 0%, rgba(229, 229, 229, 0.30) 100%)',
    boxShadow: '0px 0px 1px 0px rgba(0, 0, 0, 0.20)',
    backdropFilter: 'blur(0.5px)',
  },
  deleteWsButton: {
    width: '178px',
  },
  deleteContainer: {
    basedOn: [layout.column],
    marginTop: '69px',
    width: '324px',
  },
  hidden: {
    display: 'none',
  },
  popup: {
    maxWidth: styleguide.gridbase * 21,
    maxHeight: styleguide.gridbase * 21,
    flexShrink: 0,
  },
  wsItem: {
    borderBottom: `2px solid #f5ecdc`,
    ':last-child': {
      borderBottom: 'none',
    },
  },
  firstWsItem: {
    borderBottom: `1px solid #f5ecdc`,
    marginBottom: '8px',
  },
  copyInto: {
    width: '100%',
  },
}));

interface CardActionProps {
  cardManager: VertexManager<Note>;
  source: UISource;
}
export function EditCardAction({
  cardManager,
  source,
  ...props
}: CardActionProps) {
  const logger = useLogger();
  const docRouter = useDocumentRouter();

  const openItem = () => {
    logger.log({
      severity: 'EVENT',
      event: 'Click',
      source: 'menu:note:open',
      destination: 'editor',
      vertex: cardManager.key,
    });
    // if (editor) {
    //   editor.selection = null;
    // }
    docRouter.goTo(cardManager);
  };

  return (
    <MenuAction
      {...props}
      onClick={openItem}
      IconComponent={IconOpen}
      text="Open"
    />
  );
}

interface UploadAttachmentActionProps extends CardActionProps {
  close?: () => void;
}

export function EditDueDateAction({
  cardManager,
  source,
  ...props
}: CardActionProps) {
  const dueDateEditor = useDueDate();
  const onClick = () => {
    dueDateEditor.edit(cardManager.getVertexProxy());
  };
  const partialNote = usePartialVertex(cardManager, ['dueDate']);
  const hasDueDate = partialNote.dueDate;

  return (
    <MenuAction
      {...props}
      onClick={onClick}
      IconComponent={IconAddDueDate}
      text={hasDueDate != undefined ? 'Edit Due Date' : 'Add Due Date'}
    />
  );
}

export function ViewInNoteAction({
  cardManager,
  source,
  ...props
}: CardActionProps) {
  const logger = useLogger();
  const navigate = useNavigate();
  const pCard = usePartialVertex(cardManager, ['workspace', 'parentNote']);

  const openNote = useCallback(() => {
    logger.log({
      severity: 'EVENT',
      event: 'Click',
      source: 'menu:note:view-in-parent',
      vertex: pCard.key,
    });
    navigate(`${pCard.workspace.key}/notes/${pCard.parentNote!.key}`);
  }, [pCard, logger, navigate]);

  if (!pCard.parentNote) {
    return null;
  }

  return (
    <MenuAction
      {...props}
      onClick={openNote}
      IconComponent={IconViewNote}
      text="View In Note"
    />
  );
}
export function cardHasChildren(card: Note) {
  try {
    for (const [child] of card.inEdges('parentNote')) {
      if (!child.isDeleted) return true;
    }
  } catch (e) {}
  return false;
}

interface DeleteNoteProp extends CardActionProps {
  onDeleted?: () => void;
  showConfirmation: boolean;
  setShowConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
  isTask?: boolean;
}

export function DeleteCardAction({
  cardManager,
  showConfirmation,
  setShowConfirmation,
  isTask,
}: DeleteNoteProp) {
  const note = useVertex(cardManager);

  const handleDeleteClick = () => {
    setShowConfirmation(true);
  };
  const handleCancelClick = () => {
    setShowConfirmation(false);
  };
  const handleConfirmDelete = () => {
    note.isDeleted = 1;
    setShowConfirmation(false);
  };

  return (
    <React.Fragment>
      {!showConfirmation ? (
        <MenuAction
          IconComponent={IconDelete}
          text="Delete"
          iconWidth="16px"
          iconHeight="16px"
          onClick={() => {
            handleDeleteClick();
          }}
        />
      ) : (
        <ConfirmationDialog
          titleText={isTask ? 'Delete Task?' : 'Delete Note?'}
          approveButtonText={' Delete'}
          handleApproveClick={handleConfirmDelete}
          handleCancelClick={handleCancelClick}
        />
      )}
    </React.Fragment>
  );
}

// interface DuplicateCardActionProps extends CardActionProps {
//   editorRootKey?: string
//   source: UISource
// }
// export function DuplicateCardAction({
//   editorRootKey,
//   cardManager,
//   source,
//   ...props
// }: DuplicateCardActionProps) {
//   const graph = useGraphManager()
//   const logger = useLogger()
//   const navigate = useNavigate()

//   const onDuplicate = () => {
//     const newCard = duplicateCard(graph, cardManager.key)!
//     logger.log({
//       severity: 'EVENT',
//       event: 'Duplicate',
//       vertex: cardManager.key,
//       target: newCard?.key,
//       source,
//     })

//     if (editorRootKey === cardManager.key) {
//       navigate(`${newCard?.workspace.key}/${newCard?.key}`)
//       return
//     }

//     // TODO: Wiring for new editor
//   }

//   return (
//     <MenuAction
//       {...props}
//       onClick={onDuplicate}
//       IconComponent={IconDuplicate}
//       text="Duplicate"
//     />
//   )
// }

// interface CopyIntoCardActionProps extends CardActionProps {
//   editorRootKey?: string;
//   source: UISource;
// }
// export function CopyIntoCardAction({
//   editorRootKey,
//   cardManager,
//   source,
//   ...props
// }: CopyIntoCardActionProps) {
//   const styles = useStyles();
//   const graph = useGraphManager();
//   const logger = useLogger();
//   const navigate = useNavigate();
//   const currentWs = useVertex(cardManager).workspace;
//   const view = usePartialGlobalView('selectedWorkspaces');
//   const workspaceKeys = Array.from(view.selectedWorkspaces).map((ws) => ws.key);
//   const personalWsKey = `${graph.rootKey}-ws`;
//   if (!workspaceKeys.includes(personalWsKey)) {
//     workspaceKeys.push(personalWsKey);
//   }

//   const partialWorkspaces = usePartialVertices<Workspace>(workspaceKeys, [
//     'name',
//   ]);

//   partialWorkspaces.sort((a, b) => {
//     if (a.key === currentWs.key) return -1;
//     if (b.key === currentWs.key) return 1;
//     if (a.key === personalWsKey) return -1;
//     if (b.key === personalWsKey) return 1;
//     return coreValueCompare(a, b);
//   });
//   const [searchTerm, setSearchTerm] = useState<string>('');
//   const { maxWidthSelected } = useMaxWidth();

//   const filtered = suggestResults(
//     searchTerm,
//     partialWorkspaces,
//     (t) => t.name,
//     Number.MAX_SAFE_INTEGER
//   );
//   const onCopyInto = (wsManager: VertexManager<Workspace>) => {
//     const options: CopyIntoCardOptions = {
//       wsCopyTo: wsManager,
//     };
//     const newCard = copyIntoCard(graph, cardManager.key, options);
//     logger.log({
//       severity: 'EVENT',
//       event: 'CopyInto',
//       vertex: cardManager.key,
//       target: newCard?.key,
//       source,
//     });
//   };

//   return (
//     <SecondaryMenuItem
//       text="Copy to... "
//       IconComponent={IconDuplicate}
//       isWsList={true}
//       className={styles.copyInto}
//     >
//       <SearchBar
//         searchTerm={searchTerm}
//         setSearchTerm={setSearchTerm}
//         isSearching={true}
//         isPicker={true}
//       ></SearchBar>
//       {filtered.flatMap((ws, index) => [
//         <MenuItem
//           key={ws.key}
//           className={
//             ws.key === currentWs.key && index == 0
//               ? styles.firstWsItem
//               : styles.wsItem
//           }
//           style={{ width: `${maxWidthSelected}px` }}
//           onClick={() => onCopyInto(ws.manager as VertexManager<Workspace>)}
//         >
//           <WorkspaceIndicator
//             className={cn(styles.colorIndicator)}
//             workspace={ws.manager as VertexManager<Workspace>}
//             type="color"
//             ofSettings={false}
//           />
//           {ws.key === currentWs.key ? `${ws.name} [Current]` : ws.name}
//         </MenuItem>,
//         ws.key === currentWs.key && index == 0 ? (
//           <LineSeparator key={`separator-${ws.key}`} height={1} />
//         ) : null,
//       ])}
//     </SecondaryMenuItem>
//   );
// }

interface CopyIntoCardActionProps extends CardActionProps {
  editorRootKey?: string;
  source: UISource;
}
export function CopyIntoCardAction({
  editorRootKey,
  cardManager,
  source,
  ...props
}: CopyIntoCardActionProps) {
  const styles = useStyles();
  const graph = useGraphManager();
  const logger = useLogger();
  const navigate = useNavigate();
  const currentWs = useVertex(cardManager).workspace;
  const view = usePartialGlobalView('selectedWorkspaces');
  const workspaceKeys = Array.from(view.selectedWorkspaces).map((ws) => ws.key);
  const personalWsKey = `${graph.rootKey}-ws`;
  if (!workspaceKeys.includes(personalWsKey)) {
    workspaceKeys.push(personalWsKey);
  }

  const partialWorkspaces = usePartialVertices<Workspace>(workspaceKeys, [
    'name',
  ]);

  partialWorkspaces.sort((a, b) => {
    if (a.key === currentWs.key) return -1;
    if (b.key === currentWs.key) return 1;
    if (a.key === personalWsKey) return -1;
    if (b.key === personalWsKey) return 1;
    return coreValueCompare(a, b);
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { maxWidthSelected } = useMaxWidth();

  const filtered = suggestResults(
    searchTerm,
    partialWorkspaces,
    (t) => t.name,
    Number.MAX_SAFE_INTEGER,
  );
  const onCopyInto = (wsManager: VertexManager<Workspace>) => {
    const options: CopyIntoCardOptions = {
      wsCopyTo: wsManager,
    };
    const newCard = copyIntoCard(graph, cardManager.key, options);
    logger.log({
      severity: 'EVENT',
      event: 'CopyInto',
      vertex: cardManager.key,
      target: newCard?.key,
      source,
    });
    if (newCard) {
      navigate(`${wsManager.key}/notes/${newCard.key}`);
    }
  };

  return (
    <SecondaryMenuItem
      text="Copy to... "
      IconComponent={IconDuplicate}
      isWsList={true}
      className={styles.copyInto}
    >
      <SearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isSearching={true}
        isPicker={true}
      ></SearchBar>
      {filtered.flatMap((ws, index) => [
        <MenuItem
          key={ws.key}
          className={
            ws.key === currentWs.key && index == 0
              ? styles.firstWsItem
              : styles.wsItem
          }
          style={{ width: `${maxWidthSelected}px` }}
          onClick={() => onCopyInto(ws.manager as VertexManager<Workspace>)}
        >
          <WorkspaceIndicator
            className={cn(styles.colorIndicator)}
            workspace={ws.manager as VertexManager<Workspace>}
            type="color"
            ofSettings={false}
          />
          {ws.key === currentWs.key ? `${ws.name} [Current]` : ws.name}
        </MenuItem>,
        ws.key === currentWs.key && index == 0 ? (
          <LineSeparator key={`separator-${ws.key}`} height={1} />
        ) : null,
      ])}
    </SecondaryMenuItem>
  );
}

export function ConvertNoteAction({ cardManager, source }: CardActionProps) {
  const logger = useLogger();
  const toastController = useToastController();
  const { type } = usePartialVertex(cardManager, ['type']);
  const text = type === NoteType.Note ? 'Convert To Task' : 'Convert To Note';
  const onClick = () => {
    const p = cardManager.getVertexProxy();
    const newType = type === NoteType.Note ? NoteType.Task : NoteType.Note;
    p.type = newType;
    logger.log({
      severity: 'EVENT',
      event: 'MetadataChanged',
      source: 'menu:note:convert',
      vertex: cardManager.key,
    });

    toastController.displayToast({
      text: `${type} converted to ${newType}`,
      action: {
        text: 'Undo',
        fn: (dismiss) => {
          cardManager.getVertexProxy().type = type;
          dismiss();
        },
      },
      duration: 3000,
    });
  };
  return (
    <MenuAction
      IconComponent={type === NoteType.Note ? IconTask : IconNote}
      text={text}
      onClick={onClick}
    />
  );
}

// export function CopyUrlAction({
//   cardManager,
//   source,
//   ...props
// }: CardActionProps) {
//   const history = useHistoryStatic();
//   const eventLogger = useEventLogger();
//   const toastController = useToastController();

//   return (
//     <MenuAction
//       {...props}
//       IconComponent={IconLink}
//       iconHeight="25"
//       iconWidth="20"
//       onClick={() => {
//         const currentRoute = history.currentRoute;
//         const cardUrl = path.join(config.origin, currentRoute.url);

//         navigator.clipboard.writeText(cardUrl);

//         eventLogger.cardAction('CARD_URL_COPIED', cardManager, {
//           category: EventCategory.MENU_ITEM,
//           source,
//         });

//         toastController.displayToast({
//           text: 'Link copied to clipboard',
//           duration: 3000,
//         });
//       }}
//       text="Copy Link"
//     />
//   );
// }

export function ClearDueDateAction({
  cardManager,
  source,
  ...props
}: CardActionProps) {
  const toastController = useToastController();

  return (
    <MenuAction
      {...props}
      IconComponent={(props: IconDueDateProps) =>
        IconDueDate({ ...props, state: DueDateState.Clear })
      }
      onClick={() => {
        delete cardManager.getVertexProxy().dueDate;
        toastController.displayToast({
          text: 'Due Date Cleared',
          duration: 3000,
        });
      }}
      text="Clear Due Date"
    />
  );
}

export function ToggleSubTasksAction({
  cardManager,
  source,
  ...props
}: CardActionProps) {
  const partialNote = usePartialVertex(cardManager, [
    'childCards',
    'isChecked',
  ]);

  const onClick = useCallback(() => {
    const checked = !partialNote.isChecked;
    partialNote.isChecked = checked;
    for (const child of partialNote.childCards) {
      child.isChecked = checked;
    }
  }, [partialNote]);

  return (
    <MenuAction
      {...props}
      IconComponent={(props: IconCheckAllProps) =>
        IconCheckAll({
          ...props,
          state: partialNote.isChecked
            ? CheckAllState.Uncheck
            : CheckAllState.Check,
        })
      }
      iconHeight="25"
      iconWidth="20"
      onClick={onClick}
      text={partialNote.isChecked ? ' Uncheck All Tasks' : '   Check All Tasks'}
    />
  );
}
