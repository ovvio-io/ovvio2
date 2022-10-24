import { isString } from '../../base/comparisons.ts';
import {
  SchemeDef,
  ISchemeManagerRegister,
  NS_NOTES,
  NS_TAGS,
  NS_USERS,
  NS_WORKSPACE,
  NS_DRAFTS,
  TYPE_DATE,
  TYPE_MAP,
  TYPE_NUMBER,
  TYPE_REF,
  TYPE_REF_SET,
  // TYPE_RICHTEXT,
  TYPE_SET,
  TYPE_STR,
  TYPE_STR_SET,
  NS_INVITES,
  InviteStatus,
  AttachmentData,
  DataType,
  TYPE_RICHTEXT_V3,
  SchemeNamespace,
  TYPE_REF_MAP,
} from './scheme-types.ts';
import { initRichText } from '../richtext/tree.ts';
import { notReached } from '../../base/error.ts';

//BASE SCHEMES
const SCHEME_BASE_1 = new SchemeDef('', {
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

const SCHEME_CONTENT_BASE_1 = SCHEME_BASE_1.derive('', {
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
});

const SCHEME_DRAFT_1 = SCHEME_NOTE_3.derive(
  NS_DRAFTS,
  {
    owner: {
      type: TYPE_REF,
      required: true,
    },
  },
  ['workspace', 'type', 'status', 'parentNote']
);

const SCHEME_TAG_1 = SCHEME_CONTENT_BASE_1.derive(NS_TAGS, {
  color: TYPE_STR,
  name: TYPE_STR,
  parentTag: TYPE_REF,
});

const SCHEME_INVITE_1 = SCHEME_CONTENT_BASE_1.derive(NS_INVITES, {
  status: {
    type: TYPE_STR, //InviteStatus values
    init: () => InviteStatus.PENDING,
  },
  email: {
    type: TYPE_STR,
    required: true,
  },
  emailSent: {
    type: TYPE_NUMBER, //0 - not sent, 1 - sent
    init: () => 0,
  },
  invitee: TYPE_STR, //The invited name
  inviteeUser: TYPE_REF, //The invites user id
});

export {
  SCHEME_BASE_1 as BASE_RECORD_SCHEME,
  SCHEME_CONTENT_BASE_1 as BASE_CONTENT_SCHEME,
  SCHEME_WORKSPACE_3 as WORKSPACE_SCHEME,
  SCHEME_NOTE_4 as NOTE_SCHEME,
  SCHEME_TAG_1 as TAG_SCHEME,
  SCHEME_INVITE_1 as INVITE_SCHEME,
  SCHEME_USER_1 as USER_SCHEME,
  SCHEME_DRAFT_1 as DRAFT_SCHEME,
};

export function runRegister(manager: ISchemeManagerRegister) {
  //V1
  manager.register(
    1,
    [
      SCHEME_WORKSPACE_1,
      SCHEME_USER_1,
      SCHEME_NOTE_1,
      SCHEME_TAG_1,
      SCHEME_INVITE_1,
      SCHEME_DRAFT_1,
    ],
    []
  );

  //V2
  manager.register(
    2,
    [SCHEME_NOTE_2],
    [
      SchemeNamespace.INVITES,
      SchemeNamespace.TAGS,
      SchemeNamespace.USERS,
      SchemeNamespace.WORKSPACE,
    ],
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
    [
      SchemeNamespace.INVITES,
      SchemeNamespace.TAGS,
      SchemeNamespace.USERS,
      SchemeNamespace.WORKSPACE,
    ],
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
    [
      SchemeNamespace.INVITES,
      SchemeNamespace.TAGS,
      SchemeNamespace.USERS,
      SchemeNamespace.NOTES,
    ],
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
    [SchemeNamespace.INVITES, SchemeNamespace.TAGS, SchemeNamespace.USERS],
    (namespace, data) => {}
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
