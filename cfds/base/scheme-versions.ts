import { isString } from '../../base/comparisons.ts';
import { initRichText } from '../richtext/tree.ts';
import {
  AttachmentData,
  DataType,
  ISchemeManagerRegister,
  NS_NOTES,
  NS_TAGS,
  NS_USER_SETTINGS,
  NS_USERS,
  NS_VIEWS,
  NS_WORKSPACE,
  SchemeDef,
  SchemeNamespace,
  TYPE_DATE,
  TYPE_MAP,
  TYPE_NUMBER,
  TYPE_REF,
  TYPE_REF_MAP,
  TYPE_REF_SET,
  TYPE_RICHTEXT_V3,
  // TYPE_RICHTEXT,
  TYPE_SET,
  TYPE_STR,
  TYPE_STR_SET,
} from './scheme-types.ts';

//BASE SCHEMES
const SCHEME_BASE_1 = new SchemeDef(SchemeNamespace.Null, {
  creationDate: {
    type: TYPE_DATE,
    required: true,
    init: () => new Date(),
  },
  isDeleted: {
    type: TYPE_NUMBER,
    init: () => 0,
  },
  lastModified: {
    type: TYPE_DATE,
    init: (d: DataType) => d['creationDate'],
  },
  sortStamp: TYPE_STR,
});

const SCHEME_CONTENT_BASE_1 = SCHEME_BASE_1.derive(SchemeNamespace.Null, {
  createdBy: {
    type: TYPE_STR,
  },
  workspace: {
    type: TYPE_REF,
    required: true,
  },
});

//ACTUAL SCHEMES
const SCHEME_WORKSPACE_1 = SCHEME_BASE_1.derive(NS_WORKSPACE, {
  owner: {
    type: TYPE_REF,
    required: true,
  },
  name: {
    type: TYPE_STR,
    required: true,
  },
  users: TYPE_REF_SET,
  icon: TYPE_STR,
  noteTags: {
    type: TYPE_MAP,
    init: () => new Map(),
  },
  taskTags: {
    type: TYPE_MAP,
    init: () => new Map(),
  },
  exportImage: TYPE_STR,
  footerHtml: TYPE_STR,
});

const SCHEME_WORKSPACE_2 = SCHEME_WORKSPACE_1.derive(
  NS_WORKSPACE,
  {
    createdBy: {
      type: TYPE_REF,
    },
  },
  ['owner']
);

const SCHEME_WORKSPACE_3 = SCHEME_WORKSPACE_2.derive(NS_WORKSPACE, {
  noteTags: {
    type: TYPE_REF_MAP,
    init: () => new Map(),
  },
  taskTags: {
    type: TYPE_REF_MAP,
    init: () => new Map(),
  },
  isTemplate: TYPE_NUMBER,
});

export enum OnboardingStep {
  Start = 0,
  Finish = 1,
}

const SCHEME_USER_1 = SCHEME_BASE_1.derive(NS_USERS, {
  avatarUrl: TYPE_STR,
  email: TYPE_STR,
  lastLoggedIn: TYPE_DATE,
  name: TYPE_STR,
  workspaces: {
    type: TYPE_REF_SET,
    init: () => new Set<string>(),
  },
  seenTutorials: {
    type: TYPE_STR_SET,
    init: () => new Set<string>(),
  },
  workspaceColors: {
    type: TYPE_MAP,
    init: () => new Map<string, number>(),
  },
  hiddenWorkspaces: {
    type: TYPE_STR_SET,
    init: () => new Set<string>(),
  },
  pinnedWorkspaces: {
    type: TYPE_SET,
    init: () => new Set<string>(),
  },
  onboardingStep: {
    type: TYPE_NUMBER,
    init: () => OnboardingStep.Start,
  },
  permissions: TYPE_STR_SET,
});

const SCHEME_USER_2 = SCHEME_USER_1.derive(
  NS_USERS,
  {
    metadata: TYPE_MAP,
  },
  [
    'lastLoggedIn',
    'workspaces',
    'workspaceColors',
    'hiddenWorkspaces',
    'pinnedWorkspaces',
    'onboardingStep',
    'seenTutorials',
  ]
);

const SCHEME_USER_SETTINGS_1 = SCHEME_BASE_1.derive(NS_USER_SETTINGS, {
  lastLoggedIn: TYPE_DATE,
  seenTutorials: {
    type: TYPE_STR_SET,
  },
  workspaceColors: {
    type: TYPE_MAP,
  },
  hiddenWorkspaces: {
    type: TYPE_STR_SET,
  },
  pinnedWorkspaces: {
    type: TYPE_SET,
  },
  onboardingStep: {
    type: TYPE_NUMBER,
    default: () => OnboardingStep.Start,
  },
});

const SCHEME_NOTE_1 = SCHEME_CONTENT_BASE_1.derive(NS_NOTES, {
  assignees: {
    type: TYPE_STR_SET,
    init: () => new Set<string>(),
  },
  attachments: {
    type: TYPE_SET,
    init: () => new Set<AttachmentData>(),
  },
  // body: TYPE_RICHTEXT,
  dueDate: TYPE_DATE,
  // title: TYPE_RICHTEXT,
  parentNote: TYPE_STR,
  status: TYPE_NUMBER,
  tags: {
    type: TYPE_SET,
    init: () => new Set(),
  },
  type: TYPE_STR,
});

const SCHEME_NOTE_2 = SCHEME_NOTE_1.derive(NS_NOTES, {
  parentNote: TYPE_REF,
  tags: {
    type: TYPE_MAP,
    init: () => new Map(),
  },
});

const SCHEME_NOTE_3 = SCHEME_NOTE_2.derive(NS_NOTES, {
  title: {
    type: TYPE_RICHTEXT_V3,
    init: () => initRichText(),
  },
  body: {
    type: TYPE_RICHTEXT_V3,
    init: () => initRichText(),
  },
});

const SCHEME_NOTE_4 = SCHEME_NOTE_3.derive(NS_NOTES, {
  assignees: {
    type: TYPE_REF_SET,
    init: () => new Set<string>(),
  },
  tags: {
    type: TYPE_REF_MAP,
    init: () => new Map(),
  },
  pinnedBy: {
    type: TYPE_SET,
    init: () => new Set<string>(),
  },
  parentNote: TYPE_REF,
  completionDate: TYPE_DATE,
});

const SCHEME_TAG_1 = SCHEME_CONTENT_BASE_1.derive(NS_TAGS, {
  color: TYPE_STR,
  name: TYPE_STR,
  parentTag: TYPE_REF,
});

const SCHEME_VIEW_1 = SCHEME_BASE_1.derive(NS_VIEWS, {
  owner: {
    type: TYPE_STR,
    required: true,
  },
  parentView: TYPE_REF,

  // Screen-level settings
  selectedSettingsTab: TYPE_STR, //ADDED 12.11
  // selectedSettingsWorkspaces: TYPE_STR, //ADDED 24.12
  selectedTab: TYPE_STR,
  noteType: TYPE_STR,
  workspaceGrouping: TYPE_STR,
  selectedWorkspaces: TYPE_STR_SET,
  expandedWorkspaceGroups: TYPE_STR_SET,
  workspaceBarCollapsed: TYPE_NUMBER,

  // Tab-level settings
  selectedAssignees: TYPE_REF_SET,
  selectedTagIds: TYPE_STR_SET,
  showChecked: TYPE_STR,
  sortBy: TYPE_STR,
  showPinned: TYPE_STR,
  groupBy: TYPE_STR,
  pivot: TYPE_STR,
  viewType: TYPE_STR,
  notesExpandOverride: TYPE_STR_SET,
  notesExpandBase: TYPE_NUMBER,
  dateFilter: TYPE_STR,
  expandedGroupIds: TYPE_STR_SET,
});

const SCHEME_SESSION_1 = new SchemeDef(SchemeNamespace.SESSIONS, {
  id: {
    type: TYPE_STR,
    required: true,
  },
  publicKey: {
    type: TYPE_STR,
    required: true,
  },
  expiration: {
    type: TYPE_DATE,
    required: true,
  },
  owner: TYPE_REF, // NOTE: Anonymous sessions don't have an owner
});

const SCHEME_EVENT_1 = new SchemeDef(SchemeNamespace.EVENTS, {
  json: {
    type: TYPE_STR,
    required: true,
  },
});

export {
  SCHEME_CONTENT_BASE_1 as BASE_CONTENT_SCHEME,
  SCHEME_BASE_1 as BASE_RECORD_SCHEME,
  SCHEME_EVENT_1 as EVENT_SCHEME,
  SCHEME_NOTE_4 as NOTE_SCHEME,
  SCHEME_SESSION_1 as SESSION_SCHEME,
  SCHEME_TAG_1 as TAG_SCHEME,
  SCHEME_USER_1 as USER_SCHEME,
  SCHEME_VIEW_1 as VIEW_SCHEME,
  SCHEME_WORKSPACE_3 as WORKSPACE_SCHEME,
};

export function runRegister(manager: ISchemeManagerRegister) {
  //V1
  manager.register(
    1,
    [SCHEME_WORKSPACE_1, SCHEME_USER_1, SCHEME_NOTE_1, SCHEME_TAG_1],
    []
  );

  //V2
  manager.register(
    2,
    [SCHEME_NOTE_2],
    [SchemeNamespace.TAGS, SchemeNamespace.USERS, SchemeNamespace.WORKSPACE],
    (namespace, data) => {
      if (namespace === NS_NOTES) {
        if (data.attachments) {
          let att = data.attachments;
          if (isString(att)) {
            att = JSON.parse(att);
          }
          data.attachments = new Set(att);
        }
        if (data.tags) {
          const tagMap = new Map();
          for (const v of data.tags) {
            tagMap.set(v, v);
          }
          data.tags = tagMap;
        }
      }
    }
  );

  //V3
  manager.register(
    3,
    [SCHEME_NOTE_3],
    [SchemeNamespace.TAGS, SchemeNamespace.USERS, SchemeNamespace.WORKSPACE],
    (namespace, data) => {
      //   if (namespace === NS_NOTES) {
      //     if (data.title) {
      //       data.title = migrationToRichtextV3(data.title);
      //     }
      //     if (data.body) {
      //       data.body = migrationToRichtextV3(data.body);
      //     }
      //   }
    }
  );

  //V4
  manager.register(
    4,
    [SCHEME_WORKSPACE_2],
    [SchemeNamespace.TAGS, SchemeNamespace.USERS, SchemeNamespace.NOTES],
    (namespace, data) => {
      if (namespace === NS_WORKSPACE) {
        data.createdBy = data.owner;
        delete data.owner;
      }
    }
  );

  //V5
  manager.register(
    5,
    [SCHEME_WORKSPACE_3, SCHEME_NOTE_4, SCHEME_VIEW_1],
    [SchemeNamespace.TAGS, SchemeNamespace.USERS],
    (namespace, data) => {}
  );

  //V6
  manager.register(
    6,
    [SCHEME_USER_2, SCHEME_USER_SETTINGS_1, SCHEME_SESSION_1, SCHEME_EVENT_1],
    [
      SchemeNamespace.NOTES,
      SchemeNamespace.TAGS,
      SchemeNamespace.WORKSPACE,
      SchemeNamespace.VIEWS,
    ],
    (namespace, data) => {
      if (namespace === NS_TAGS) {
        delete data.color;
        delete data.workspace;
        delete data.createdBy;
      } else if (namespace === NS_USERS) {
        delete data.lastLoggedIn;
        delete data.workspaces;
        delete data.workspaceColors;
        delete data.hiddenWorkspaces;
        delete data.pinnedWorkspaces;
        delete data.onboardingStep;
        delete data.seenTutorials;
      } else if (namespace === NS_WORKSPACE) {
        delete data.noteTags;
        delete data.taskTags;
        delete data.createdBy;
      } else if (namespace === NS_NOTES) {
        delete data.status;
      }
    }
  );

  //Next Version Here
}

/**
 * How to upgrade schemes:
 *
 * 2 scenarios:
 * 1. You want to add a new field to base or a specific scheme, without touching existing fields:
 *    Solution: add field where you need. no need to register new version.
 * 2. You want to change an existing field type, or upgrade record data:
 *    Solution:
 *      Create a new SchemeDef file with the changes.
 *      SchemeManager.register() with the new SchemeDef + the upFunc
 *      IMPORTANT: need to modify compatibilityVersion in package.json, this will cause webapp users to clear
 *                 their local cache and get the new record version.
 */
