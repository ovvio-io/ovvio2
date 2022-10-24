/**
 * How to add a new event action:
 * 1. Choose the event group: General, Card, Workspace, Tag,...
 * 2. Add the event:
 *    2.1 if it is an empty event:
 *        EVENT_NAME: {};
 *    2.2 if is has custom data: the data object will be parse as JSON string.
 *        EVENT_NAME: {
 *           data: {
 *                f1: string;
 *                f2?: number;
 *                f3: boolean;
 *           }
 *        }
 *    2.3 if you want a global field to be mandatory:
 *        EVENT_NAME: {
 *           workspaceId: string;
 *        }
 *    you can combine 2.2 with 2.3
 */

type MarketingData = {
  pathName?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  inviteId?: string;
  gclid?: string;
};

export type GeneralEventActions = {
  ADD_WORKSPACE_CLICKED: {};
  DESKTOP_APP_DOWNLOAD_CLICKED: {};
  DESKTOP_APP_SIGNIN_CLICKED: {};
  SIGNED_IN: {};
  SESSION_START: {
    data: MarketingData;
  };
  SESSION_ALIVE: {
    data: {
      avgLatency: number;
      pingPongs: number;
      pendingEvents: number;
      visibilityState: string;
    };
  };
  SESSION_END: {};
  SIGNED_OUT: {};
  ERROR_LOG: {
    data: {
      logMessage: string;
      errorName?: string;
      errorMessage?: string;
      errorStack?: string;
      errorOrigin?: string;
    };
  };
  DEMO_CLEAR_STARTED: {};
  DEMO_CLEAR_DONE: {};
  FEEDBACK_STARTED: {};
  FEEDBACK_COMPLETED: {};
  SIGNED_UP: {
    data: MarketingData;
  };
  FILTER_TAGS_EXPANDED: {};
  FILTER_TAGS_COLLAPSED: {};
  FILTER_ASSIGNEES_EXPANDED: {};
  FILTER_ASSIGNEES_COLLAPSED: {};

  FILTER_ASSIGNEES_SELECTED: {
    selectedUserId: string;
  };
  FILTER_ASSIGNEES_UNSELECTED: {
    selectedUserId: string;
  };
  TAG_CREATE_STARTED: {
    workspaceId: string;
  };
  TAG_CREATE_CANCELED: {
    workspaceId: string;
  };
  TAG_CREATE_COMPLETED: {
    workspaceId: string;
    tagId: string;
  };
  SORTBY_CHANGE_STARTED: {};
  SORTBY_CHANGE_COMPLETED: {};

  VIDEO_DEMO_PLAYING: {};
  VIDEO_DEMO_PAUSED: {};
  VIDEO_DEMO_ENDED: {};
  VIDEO_DEMO_CLOSED: {};
  TUTORIAL_NEXT_CLICKED: {
    data: { stepId: string; tutorialId: string };
  };
  TUTORIAL_DISMISS_CLICKED: {
    data: { stepId: string; tutorialId: string };
  };
  TUTORIAL_DONE: {
    data: { tutorialId: string };
  };
  SHOW_LEGEND: {};
  HIDE_LEGEND: {};
  HIDE_TOOLTIP: {};
  DRAG_STARTED: {};
  DRAG_DONE: {};
  DRAG_CANCELLED: {
    data: { reason: string };
  };
  FAB_SPEED_DIAL_OPENED: {};
  FAB_SPEED_DIAL_CLOSED: {};
  TOOLBAR_MENU_OPENED: {};
  OVVIO_HEADER_CLICKED: {};

  SESSION_LOADED: {};
  SESSION_FORCED_REFRESH: {};

  CARD_SEARCH_FOCUSED: {};
  CARD_SEARCH_ACTIVATED: {};
  CARD_SEARCH_DEACTIVATED: {};
  FILTER_TAGS_SINGLE_SELECTED: {};
  FILTER_TAGS_SINGLE_UNSELECTED: {};
  FILTER_TAGS_CHILD_SELECTED: {};
  FILTER_TAGS_CHILD_UNSELECTED: {};
  FILTER_TAGS_PARENT_SELECTED: {};
  FILTER_TAGS_PARENT_UNSELECTED: {};
  BACK_BUTTON_CLICKED: {};
  WORKSPACE_CLICKED: {};

  SET_VIEW_TYPE: {
    data: { viewType: string };
  };
  SET_GROUP_BY: {
    data: { groupBy: string; tag?: string };
  };
  FILTER_BAR_HIDDEN: {};
  FILTER_BAR_SHOWN: {};
  COMPOSE_BUTTON_MENU_OPENED: {};
  CRITICAL_ERROR_POPUP_RAISED: {};
  CRITICAL_ERROR_REFRESH_CLICKED: {};

  WORKSPACE_INVITE_SCREEN_ENTERED: {};
  WORKSPACE_INVITE_EMAIL_ADDED: {};
  WORKSPACE_INVITE_SCREEN_CLOSED: {};
  WORKSPACE_CREATE_STARTED: {};
  WORKSPACE_CREATE_COMPLETED: {
    workspaceId: string;
  };
  WORKSPACES_ALL_SELECTED: {};
  WORKSPACES_ALL_UNSELECTED: {};
};

export type CardEventActions = {
  EXPORT_EMAIL_STARTED: {};
  EXPORT_EMAIL_SUCCESS: {
    data: {
      exportType: string;
      exportError?: number;
    };
  };
  CARD_OPENED: {};
  PARENT_CARD_OPENED: {};
  CARD_SET_DUE_DATE_STARTED: {};
  CARD_SET_DUE_DATE_CANCELED: {};
  CARD_SET_DUE_DATE_COMPLETED: {};
  CARD_DUE_DATE_REMOVED: {};
  TASK_CTA_CLICKED: {};
  CARD_ADD_ATTACHMENT_STARTED: {};
  CARD_ADD_ATTACHMENT_COMPLETED: {};
  CARD_ADD_ATTACHMENT_CANCELED: {};
  CARD_ATTACHMENT_REMOVED: {};
  CARD_ATTACHMENT_DOWNLOAD_SUCCESS: {};
  CARD_DELETE_STARTED: {};
  CARD_DELETE_CANCELED: {};
  CARD_DELETE_COMPLETED: {};
  CARD_TASK_DELETED: {};
  CARD_TAG_ADDED: {
    tagId: string;
  };
  CARD_TAG_REMOVED: {
    tagId: string;
  };

  CARD_TAG_REPLACED: {
    tagId: string;
  };
  CARD_ASSIGNEE_ADDED: {
    selectedUserId: string;
  };
  CARD_TYPE_CONVERTED: {};
  CARD_ASSIGNEE_REMOVED: {
    selectedUserId: string;
  };
  CARD_ASSIGNEE_SWITCH_REMOVED: {
    selectedUserId: string;
  };
  CARD_ASSIGNEE_SWITCH_ADDED: {
    selectedUserId: string;
  };
  CARD_CREATED: {};
  CARD_BACKSPACED: {};
  CARD_DUPLICATED: {
    data: { newCardId: string };
  };
  EXPORT_PDF_STARTED: {};
  EXPORT_PDF_COMPLETED: {};
  EXPORT_PDF_CANCELED: {};
  CARD_OPTIONS_CLICKED: {};
  CARD_MENTION_ADDED: {
    selectedUserId: string;
  };
  CARD_TASK_CHECKED: {
    tagId: string;
  };
  CARD_TASK_UNCHECKED: {
    tagId: string;
  };
  CARD_MOVED: {
    data: { newWorkspaceId: string; newCardId: string };
  };
  CARD_MOVE_FAILED: {
    data: { cardId: string };
  };
  CARD_URL_COPIED: {};
  EDITOR_FOCUSED: {};
};

export type WSEventActions = {
  PIN_WORKSPACE: {};
  UNPIN_WORKSPACE: {};
  SHOW_WORKSPACE: {};
  HIDE_WORKSPACE: {};
  WORKSPACE_SELECTED: {
    data: {
      toggleType: string;
    };
  };
  WORKSPACE_UNSELECTED: {
    data: {
      toggleType: string;
    };
  };
  WORKSPACE_SETTINGS_ENTERED: {};
  WORKSPACE_SETTINGS_TAGS_TAB_CLICKED: {};
  WORKSPACE_SETTINGS_WS_TAB_CLICKED: {};
  WORKSPACE_SETTINGS_CANCELED: {};
  WORKSPACE_SETTINGS_CLOSED: {};
  WORKSPACE_SETTINGS_SAVED: {};
  WORKSPACE_CONFIG_SAVED: {};
  WORKSPACE_EMAIL_COPIED: {};
  WORKSPACE_REMOVE_INVITE_COMPLETED: {
    data: {
      inviteId: string;
    };
  };
  WORKSPACE_REMOVE_USER_DIALOG_OPENED: {};
  WORKSPACE_REMOVE_USER_STARTED: {
    selectedUserId: string;
  };
  WORKSPACE_REMOVE_USER_COMPLETED: {
    selectedUserId: string;
  };
  TAG_CREATED: {
    tagId: string;
  };
  TAG_UPDATED: {
    tagId: string;
  };
  TAG_DELETED: {
    tagId: string;
  };
  WORKSPACE_INVITE_SENT: {
    data: { emailCount: number };
  };
  WORKSPACE_NAME_CHANGED: {};
  WORKSPACE_ICON_CHANGED: {};
  WORKSPACE_DELETE_STARTED: {};
  WORKSPACE_DELETE_COMPLETED: {};
  TAG_SETTINGS_CREATE_PARENT_TAG: {};
  TAG_SETTINGS_TAG_FOCUSED: {};
  TAG_SETTINGS_PARENT_TAG_REMOVED: {};
  TAG_SETTINGS_CHILD_TAG_REMOVED: {};
  TAG_SETTINGS_TAG_UNFOCUSED: {};
  TAG_SETTINGS_COLOR_CHANGED: {};
  TAG_SETTINGS_CREATE_CHILD_TAG: {};
};

export type TagEventActions = {
  FILTER_SUBTAGS_EXPANDED: {};
  FILTER_SUBTAGS_COLLAPSED: {};
  FILTER_TAGS_SELECTED: {};
};
