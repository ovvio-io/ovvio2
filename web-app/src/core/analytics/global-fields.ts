import { EventCategory } from './categories.ts';

/**
 * Every Global field corresponds to a field in the user-events table.
 * If you add a field here, also add it in the table.
 */
export type GlobalEventFields = {
  category?: EventCategory;
  cardId?: string;
  parentCardId?: string;
  workspaceId?: string;
  /**
   * Source/Origin of action
   */
  source?: string;
  timestamp?: number;
  tagId?: string;
  parentTagId?: string;
  tagUnion?: boolean;
  selectedUserId?: string;
};
