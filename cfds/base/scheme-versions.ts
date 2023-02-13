import { isString } from '../../base/comparisons.ts';
import {
  SchemeDef,
  ISchemeManagerRegister,
  NS_NOTES,
  NS_TAGS,
  NS_USERS,
  NS_WORKSPACE,
  TYPE_DATE,
  TYPE_MAP,
  TYPE_NUMBER,
  TYPE_REF,
  TYPE_REF_SET,
  // TYPE_RICHTEXT,
  TYPE_SET,
  TYPE_STR,
  TYPE_STR_SET,
  AttachmentData,
  TYPE_RICHTEXT_V3,
  SchemeNamespace,
  TYPE_REF_MAP,
  NS_USER_SETTINGS,
  NS_FILTER,
} from './scheme-types.ts';
import { initRichText } from '../richtext/tree.ts';
import { notReached } from '../../base/error.ts';
import { Record } from './record.ts';

//BASE SCHEMES
const SCHEME_BASE_1 = new SchemeDef('', {
  creationDate: {
    type: TYPE_DATE,
    required: true,
    default: () => new Date(),
  },
  isDeleted: {
    type: TYPE_NUMBER,
    default: () => 0,
  },
  lastModified: {
    type: TYPE_DATE,
    default: (rec: Record) => rec.get('creationDate'),
  },
  sortStamp: TYPE_STR,
});

const SCHEME_CONTENT_BASE_1 = SCHEME_BASE_1.derive(
  '',
  {
    createdBy: {
      type: TYPE_STR,
    },
    workspace: {
      type: TYPE_REF,
    },
  },
  [],
  'workspace'
);

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
    default: () => new Map(),
  },
  taskTags: {
    type: TYPE_MAP,
    default: () => new Map(),
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
    default: () => new Map(),
  },
  taskTags: {
    type: TYPE_REF_MAP,
    default: () => new Map(),
  },
});

const SCHEME_WORKSPACE_4 = SCHEME_WORKSPACE_3.derive(NS_WORKSPACE, {}, [
  'noteTags',
  'taskTags',
]);

export enum OnboardingStep {
  Start = 0,
  Finish = 1,
}

const SCHEME_USER_1 = SCHEME_BASE_1.derive(NS_USERS, {
  avatarUrl: TYPE_STR,
  email: TYPE_STR,
  name: TYPE_STR,
  lastLoggedIn: TYPE_DATE,
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
});

const SCHEME_USER_2 = SCHEME_USER_1.derive(NS_USERS, {}, [
  'lastLoggedIn',
  'workspaces',
  'workspaceColors',
  'hiddenWorkspaces',
  'pinnedWorkspaces',
  'onboardingStep',
  'seenTutorials',
]);

const SCHEME_USER_SETTINGS_1 = SCHEME_BASE_1.derive(NS_USER_SETTINGS, {
  passwordHash: TYPE_STR, // Hash + salt
  lastLoggedIn: TYPE_DATE,
  seenTutorials: {
    type: TYPE_STR_SET,
    default: () => new Set<string>(),
  },
  workspaceColors: {
    type: TYPE_MAP,
    default: () => new Map<string, number>(),
  },
  hiddenWorkspaces: {
    type: TYPE_STR_SET,
    default: () => new Set<string>(),
  },
  pinnedWorkspaces: {
    type: TYPE_SET,
    default: () => new Set<string>(),
  },
  onboardingStep: {
    type: TYPE_NUMBER,
    default: () => OnboardingStep.Start,
  },
});

const SCHEME_NOTE_1 = SCHEME_CONTENT_BASE_1.derive(NS_NOTES, {
  assignees: {
    type: TYPE_STR_SET,
    default: () => new Set<string>(),
  },
  attachments: {
    type: TYPE_SET,
    default: () => new Set<AttachmentData>(),
  },
  // body: TYPE_RICHTEXT,
  dueDate: TYPE_DATE, // Task only, zero on convert
  // title: TYPE_RICHTEXT,
  parentNote: TYPE_STR, // Let's debate
  status: TYPE_NUMBER, // Task only, zero on convert
  tags: {
    type: TYPE_SET,
    default: () => new Set(),
  },
  type: TYPE_STR, // Undo for convert
});

const SCHEME_NOTE_2 = SCHEME_NOTE_1.derive(NS_NOTES, {
  parentNote: TYPE_REF,
  tags: {
    type: TYPE_MAP,
    default: () => new Map(),
  },
});

const SCHEME_NOTE_3 = SCHEME_NOTE_2.derive(NS_NOTES, {
  title: {
    type: TYPE_RICHTEXT_V3,
    default: () => initRichText(),
  },
  body: {
    type: TYPE_RICHTEXT_V3,
    default: () => initRichText(),
  },
});

const SCHEME_NOTE_4 = SCHEME_NOTE_3.derive(NS_NOTES, {
  assignees: {
    type: TYPE_REF_SET,
    default: () => new Set<string>(),
  },
  tags: {
    type: TYPE_REF_MAP,
    default: () => new Map(),
  },
  pinnedBy: {
    type: TYPE_SET,
    default: () => new Set<string>(),
  },
  parentNote: TYPE_REF,
});

const SCHEME_NOTE_5 = SCHEME_NOTE_4.derive(NS_NOTES, {
  status: TYPE_STR,
});

const SCHEME_TAG_1 = SCHEME_CONTENT_BASE_1.derive(NS_TAGS, {
  color: TYPE_STR,
  name: TYPE_STR,
  parentTag: TYPE_REF,
});

const SCHEME_TAG_2 = SCHEME_TAG_1.derive(NS_TAGS, {}, ['color']);

const SCHEME_FILTER_1 = SCHEME_BASE_1.derive(
  NS_FILTER,
  {
    owner: {
      type: TYPE_REF,
      required: true,
    },
    tags: TYPE_REF_SET,
    assignees: TYPE_REF_SET,
    workspaces: TYPE_REF_SET,
    noteType: TYPE_STR,
    statuses: TYPE_STR_SET,
    sortBy: TYPE_STR,
    pinned: TYPE_NUMBER,
    groupBy: TYPE_STR,
    groupByPivot: TYPE_REF,
    textQuery: TYPE_STR,
  },
  [],
  // Filters are currently personal and live under the user's private repo
  'owner'
);

export {
  SCHEME_BASE_1 as BASE_RECORD_SCHEME,
  SCHEME_CONTENT_BASE_1 as BASE_CONTENT_SCHEME,
  SCHEME_WORKSPACE_4 as WORKSPACE_SCHEME,
  SCHEME_NOTE_5 as NOTE_SCHEME,
  SCHEME_TAG_2 as TAG_SCHEME,
  SCHEME_USER_2 as USER_SCHEME,
  SCHEME_USER_SETTINGS_1 as USER_SETTINGS,
  SCHEME_FILTER_1 as SCHEME_FILTER,
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
      if (namespace === NS_NOTES) {
        if (data.title) {
          notReached('Unsupported old format RichText v2');
          // data.title = migrationToRichtextV3(data.title);
        }
        if (data.body) {
          notReached('Unsupported old format RichText v2');
          // data.body = migrationToRichtextV3(data.body);
        }
      }
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
    [SCHEME_WORKSPACE_3, SCHEME_NOTE_4],
    [SchemeNamespace.TAGS, SchemeNamespace.USERS],
    (namespace, data) => {}
  );

  //V6
  manager.register(
    6,
    [
      SCHEME_WORKSPACE_4,
      SCHEME_USER_2,
      SCHEME_USER_SETTINGS_1,
      SCHEME_TAG_2,
      SCHEME_FILTER_1,
      SCHEME_NOTE_5,
    ],
    [],
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
