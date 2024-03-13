import React, { ReactNode, createContext, useContext, useState } from 'react';
import { makeStyles, cn } from '../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../styles/layout.ts';
import { MediaQueries } from '../../../../../../styles/responsive.ts';
import { styleguide } from '../../../../../../styles/styleguide.ts';
import { usePartialView } from '../../../../core/cfds/react/graph.tsx';
import { ToolbarCenterItem } from '../toolbar/index.tsx';
import { ActiveFiltersView } from './display-bar/filters/active-filters.tsx';
import { FiltersView } from './display-bar/filters/index.tsx';
import {
  SIDES_PADDING,
  TABLET_PADDING,
  MOBILE_PADDING,
  DisplayBar,
} from './display-bar/index.tsx';
import { Dashboard } from '../dashboard/dashboard.tsx';
import { KanbanView } from './kanban-view/index.tsx';
import { ListViewNew } from './list-view/index.tsx';
import { Note } from '../../../../../../cfds/client/graph/vertices/note.ts';
import { Vertex } from '../../../../../../cfds/client/graph/vertex.ts';
import { VertexManager } from '../../../../../../cfds/client/graph/vertex-manager.ts';
import { useDisable } from '../../../index.tsx';

const useStyles = makeStyles((theme) => ({
  displayRoot: {
    flexShrink: 0,
    flexGrow: 0,
    overflowY: 'auto',
    height: '100%',
    width: '100%',
    basedOn: [layout.row],
  },
  displayMain: {
    // position: 'relative',
    height: '100%',
    overflow: 'hidden',
    flexShrink: 1,
    flexGrow: 1,
    basedOn: [layout.column, layout.flex],
    backgroundColor: theme.background[100],
  },
  displayContent: {
    boxSizing: 'border-box',
    padding: [styleguide.gridbase * 2, 0],
    overflow: 'hidden',
    basedOn: [layout.flexSpacer],
  },
  title: {
    marginTop: styleguide.gridbase * 2,
    padding: [0, styleguide.gridbase * 2],
    height: styleguide.gridbase * 6,
    boxSizing: 'border-box',
  },
  contentView: {
    padding: [0, SIDES_PADDING],
    [MediaQueries.TabletOnly]: {
      padding: [0, TABLET_PADDING],
    },
    [MediaQueries.Mobile]: {
      padding: [0, MOBILE_PADDING],
    },
  },
  filters: {
    padding: [0, SIDES_PADDING],
    [MediaQueries.TabletOnly]: {
      padding: [0, TABLET_PADDING],
    },
    [MediaQueries.Mobile]: {
      padding: [0, MOBILE_PADDING],
    },
  },
  activeFilters: {
    padding: [styleguide.gridbase * 2, SIDES_PADDING],

    [MediaQueries.TabletOnly]: {
      padding: [styleguide.gridbase * 2, TABLET_PADDING],
    },
    [MediaQueries.TabletOnly]: {
      padding: [styleguide.gridbase * 2, MOBILE_PADDING],
    },
  },
}));

interface PendingActionContextType {
  pendingAction: boolean;
  setPendingAction: React.Dispatch<React.SetStateAction<boolean>>;
}

const PendingActionContext = createContext<
  PendingActionContextType | undefined
>(undefined);

export const usePendingAction = () => {
  const context = useContext(PendingActionContext);
  if (!context) {
    throw new Error('Error in PendingActions');
  }
  return context;
};

interface PendingActionProviderProps {
  children: ReactNode;
}

export const PendingActionProvider: React.FC<PendingActionProviderProps> = ({
  children,
}) => {
  const [pendingAction, setPendingAction] = useState<boolean>(false);

  return (
    <PendingActionContext.Provider value={{ pendingAction, setPendingAction }}>
      {children}
    </PendingActionContext.Provider>
  );
};

export function CardsDisplay() {
  const styles = useStyles();
  const view = usePartialView('viewType', 'selectedTabId');
  const [selectedCards, setSelectedCards] = useState<Set<VertexManager<Note>>>(
    new Set()
  );

  let content = null;
  const onCloseMultiSelect = () => {
    setSelectedCards(new Set());
  };

  const handleSelectClick = (card?: Note) => {
    if (card) {
      const updatedSelectedCards = new Set(selectedCards);
      if (updatedSelectedCards.has(card.manager)) {
        updatedSelectedCards.delete(card.manager);
      } else {
        updatedSelectedCards.add(card.manager);
      }
      setSelectedCards(updatedSelectedCards);
    }
  };

  if (view.selectedTabId === 'overview') {
    content = <Dashboard />;
  } else if (view.viewType === 'list') {
    content = (
      <ListViewNew
        key={'list'}
        className={cn(styles.contentView)}
        selectedCards={selectedCards}
        setSelectedCards={setSelectedCards}
        handleSelectClick={handleSelectClick}
      />
    );
  } else if (view.viewType === 'board') {
    content = (
      <KanbanView
        key={'board'}
        className={cn(styles.contentView)}
        selectedCards={selectedCards}
        setSelectedCards={setSelectedCards}
        handleSelectClick={handleSelectClick}
      />
    );
  }
  return (
    <PendingActionProvider>
      <div className={cn(styles.displayRoot)}>
        <div className={cn(styles.displayMain)}>
          <DisplayBar
            selectedCards={selectedCards}
            onCloseMultiSelect={onCloseMultiSelect}
            setSelectedCards={setSelectedCards}
          />

          <ToolbarCenterItem
            className={cn(layout.flexSpacer)}
          ></ToolbarCenterItem>
          <FiltersView className={cn(styles.filters)} />
          <ActiveFiltersView className={cn(styles.activeFilters)} />
          <div className={cn(styles.displayContent)}>{content}</div>
        </div>
      </div>
    </PendingActionProvider>
  );
}
