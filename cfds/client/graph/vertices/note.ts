import * as SetUtils from '../../../../base/set.ts';
import { User } from './user.ts';
import { ContentVertex } from './base.ts';
import {
  AttachmentData,
  NoteStatus,
  NS_NOTES,
  SchemeNamespace,
  SortBy,
} from '../../../base/scheme-types.ts';
import {
  initRichText,
  RichText,
  treeToPlaintext,
} from '../../../richtext/tree.ts';
import {
  composeRichText,
  decomposeRichText,
  extractOrderedRefs,
  extractRefs,
  RefPlaceholder,
} from '../../../richtext/composer.ts';
import {
  FieldTriggers,
  keyDictToVertDict,
  kNoRefsValue,
  vertDictToKeyDict,
  Vertex,
  VertexConfig,
} from '../vertex.ts';
import { Tag } from './tag.ts';
import {
  MutationOrigin,
  MutationPack,
  mutationPackAppend,
  mutationSourceIsUser,
} from '../mutations.ts';
import {
  docFromRT,
  docToRT,
  Document,
  projectRanges,
  UnkeyedDocument,
} from '../../../richtext/doc-state.ts';
import {
  flattenRichText,
  projectPointers,
  reconstructRichText,
  stripFormattingFilter,
} from '../../../richtext/flat-rep.ts';
import { treeToMarkdown } from '../../../richtext/markdown.ts';
import { triggerChildren, triggerParent } from '../propagation-triggers.ts';
import { VertexManager } from '../vertex-manager.ts';
import { SortDescriptor } from '../query.ts';
import { coreObjectClone } from '../../../../base/core-types/clone.ts';
import { Dictionary } from '../../../../base/collections/dict.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';

export enum NoteType {
  Task = 'task',
  Note = 'note',
}

export class Note extends ContentVertex {
  private _cachedBody?: Document;
  private _cachedBodyPreview?: string;
  private _cachedTitle?: Document;
  private _cachedTitleRT?: RichText;
  private _cachedChildCards?: VertexManager<Note>[];
  private _cachedPlaintextTitle?: string;
  private _lastManualAssigneeChange: number;
  private _lastManualTagChange: number;

  constructor(
    mgr: VertexManager,
    prevVertex: Vertex | undefined,
    config: VertexConfig | undefined,
  ) {
    super(mgr, prevVertex, config);
    if (prevVertex instanceof Note) {
      this._cachedBodyPreview = prevVertex._cachedBodyPreview;
      this._cachedPlaintextTitle = prevVertex._cachedPlaintextTitle;
      this._lastManualAssigneeChange = prevVertex._lastManualAssigneeChange;
      this._lastManualTagChange = prevVertex._lastManualTagChange;
      this._cachedPlaintextTitle = prevVertex._cachedPlaintextTitle;
    } else {
      const creationTime = this.creationDate.getTime();
      this._lastManualAssigneeChange = creationTime;
      this._lastManualTagChange = creationTime;
    }
  }

  get parent(): Vertex | undefined {
    return this.parentNote || super.parent;
  }

  parentNoteDidMutate(
    local: boolean,
    oldValue: Note | undefined,
  ): MutationPack {
    return [
      ['parent', local, oldValue],
      ['parentType', local, oldValue?.type],
    ];
  }

  get assignees(): Set<User> {
    const wsUsers = this.workspace.users;
    return SetUtils.filter(this.vertSetForField<User>('assignees'), (u) =>
      wsUsers.has(u),
    );
  }

  set assignees(users: Set<User>) {
    this.record.set(
      'assignees',
      SetUtils.map(users, (u) => u.key),
    );
  }

  clearAssignees(): void {
    this.record.set('assignees', new Set());
  }

  parentAssigneesDidMutate(
    origin: MutationOrigin,
    oldValue: Set<User> | undefined,
  ): MutationPack {
    if (!mutationSourceIsUser(origin)) {
      return;
    }
    const currentAssignees = this.assignees;
    if (currentAssignees.size > 0) {
      return;
    }
    this.assignees = this.parentNote!.assignees;
    return ['assignees', origin, currentAssignees];
  }

  // assigneesDidMutate(
  //   source: MutationOrigin,
  //   oldValue: Set<User> | undefined
  // ): MutationPack {
  //   if (!oldValue) {
  //     oldValue = new Set();
  //   }
  //   if (mutationSourceIsUser(source)) {
  //     const assignees = this.assignees;
  //     const now = Date.now();
  //     this._lastManualAssigneeChange = now;
  //     if (
  //       now - this._lastManualTagChange > kRuleApplicationBackoffDurationMs &&
  //       now - this.creationDate.getTime() > kRuleApplicationBackoffCreationMs
  //     ) {
  //       const roles = this.graph.sharedQueriesManager.rolesQuery.vertices;
  //       const noteTags = this.tags;
  //       let changed = false;
  //       for (const r of roles) {
  //         const hasAssignees = SetUtils.intersects(r.assignees, assignees);
  //         const roleTags = r.resolveTagsForWorkspace(this.workspace);

  //         if (hasAssignees) {
  //           for (const tag of roleTags) {
  //             if (tag.parentTag) {
  //               if (noteTags.get(tag.parentTag) !== tag) {
  //                 noteTags.set(tag.parentTag, tag);
  //                 changed = true;
  //               }
  //             } else {
  //               if (noteTags.get(tag) !== tag) {
  //                 noteTags.set(tag, tag);
  //                 changed = true;
  //               }
  //             }
  //           }
  //         } else {
  //           for (const tag of roleTags) {
  //             if (
  //               (tag.parentTag && noteTags.get(tag.parentTag) === tag) ||
  //               noteTags.has(tag)
  //             ) {
  //               noteTags.delete(tag.parentTag || tag);
  //               changed = true;
  //             }
  //           }
  //         }
  //       }
  //       if (changed) {
  //         const oldTags = this.tags;
  //         this.tags = noteTags;
  //         return ['tags', 'rule', oldTags];
  //       }
  //     }
  //   }
  // }

  get attachments(): Set<AttachmentData> {
    const attachments = this.record.get('attachments') as Set<AttachmentData>;
    if (attachments === undefined || attachments.size === 0) {
      return new Set<AttachmentData>();
    }

    const copy = SetUtils.map(attachments, (v) => coreObjectClone(v));
    return copy;
  }

  set attachments(set: Set<AttachmentData>) {
    const copy = SetUtils.map(set, (v) => coreObjectClone(v));
    this.record.set('attachments', copy);
  }

  clearAttachments(): void {
    this.record.set('attachments', new Set());
  }

  get body(): Document {
    if (this._cachedBody === undefined) {
      const graph = this.graph;
      this._cachedBody = docFromRT(
        composeRichText(
          (key) => {
            const note = graph.getVertex<Note>(key);
            if (note.isNull) {
              return RefPlaceholder.Loading;
            }
            if (note.isDeleted) {
              return RefPlaceholder.Deleted;
            }
            return note.record.get('title') as RichText;
          },
          this.record.get('body') || initRichText(),
          true,
        ),
      );
    }
    return this._cachedBody;
  }

  set body(rt: UnkeyedDocument) {
    // Take a snapshot of the out refs before changing the value
    const oldRefs = this.getBodyRefs();
    rt = projectRanges(this.body, rt, (ptr) =>
      this.graph.ptrFilterFunc(ptr.key),
    );
    this._cachedBody = undefined;
    const graph = this.graph;
    //  Update our body while applying edits to inner tasks' titles
    const updatedBody = decomposeRichText(
      (key, rt) => {
        let childV: Note;
        if (!oldRefs.has(key)) {
          if (graph.hasVertex(key)) {
            // This was a deleted task.
            childV = graph.getVertex<Note>(key);
            childV.isDeleted = 0;
          } else {
            // New Task
            childV = graph.createVertex(
              NS_NOTES,
              {
                creationDate: new Date(),
                parentNote: this.key,
                type: NoteType.Task,
                createdBy: this.createdBy?.key,
                workspace: this.workspace.key,
                assignees: new Set([this.graph.rootKey]),
              },
              key,
            );
          }
        } else {
          // Existing task
          childV = graph.getVertex<Note>(key);
        }
        childV.titleRT = rt;
      },
      docToRT(rt),
      true,
    );
    this.record.set('body', updatedBody);
    this._cachedBody = undefined;
    // Get out refs after the update
    const newRefs = this.getBodyRefs();
    // Compare them with old refs to find deleted tasks
    const deletedKeys = SetUtils.subtract(oldRefs, newRefs);
    // Mark deleted tasks as such
    for (const key of deletedKeys) {
      graph.getVertex<Note>(key).isDeleted = 1;
    }
  }

  clearBody(): void {
    this.body = docFromRT(initRichText());
  }

  /**
   * @deprecated User bodyRefs getter instead.
   */
  getBodyRefs(): Set<string> {
    return this.bodyRefs;
  }

  get bodyRefs(): Set<string> {
    const bodyRT = this.record.get('body');
    if (bodyRT === undefined) {
      return new Set();
    }
    return extractRefs(bodyRT.root, true);
  }

  getOrderedBodyRefs(): string[] {
    const bodyRT = this.record.get('body');
    if (bodyRT === undefined) {
      return [];
    }
    return extractOrderedRefs(bodyRT.root, true);
  }

  getRawBody(): RichText | undefined {
    return this.record.get('body');
  }

  get bodyPreview(): string {
    if (this._cachedBodyPreview === undefined) {
      this._cachedBodyPreview = stripWhitelines(treeToMarkdown(this.body.root));
    }
    return this._cachedBodyPreview;
  }

  bodyDidMutate(local: boolean, oldValue: Document | undefined): MutationPack {
    this._cachedBodyPreview = undefined;
    this._cachedBody = undefined;
    this._cachedChildCards = undefined;
    const prevBodyRefs = oldValue && extractRefs(oldValue.root, true);
    return [
      ['bodyPreview', local, stripWhitelines(treeToMarkdown(oldValue?.root))],
      ['childCards', local, this._cachedChildCards],
      ['bodyRefs', local, prevBodyRefs],
    ];
  }

  private _invalidateBodyOnChildChange(
    local: boolean,
    childKey: string,
  ): MutationPack {
    // The UI will typically first create the child task, then insert the ref
    // to the parent note's body. If we emit a mutation before the body actually
    // has the ref in it, bad things will happen.
    if (this.getBodyRefs().has(childKey)) {
      const oldValue = this._cachedBody;
      this._cachedBody = undefined;
      return ['body', local, oldValue];
    }
  }

  get childCards(): Note[] {
    if (this._cachedChildCards === undefined) {
      const graph = this.graph;
      const childCards: VertexManager<Note>[] = [];
      for (const key of this.getOrderedBodyRefs()) {
        const mgr = graph.getVertexManager<Note>(key);
        const vert = mgr.getVertexProxy();
        if (vert instanceof Note && !vert.isDeleted) {
          childCards.push(mgr);
        }
      }
      // for (const child of this.getChildManagers<Note>(SchemeNamespace.NOTES)) {
      //   if (!child.isDeleted) {
      //     childCards.push(child);
      //   }
      // }

      // return childCards.map(mgr => mgr.getVertexProxy());
      this._cachedChildCards = childCards;
    }
    return this._cachedChildCards.map((mgr) => mgr.getVertexProxy());
  }

  private _invalidateChildCards(local: boolean): MutationPack {
    const res: MutationPack = ['childCards', local, this._cachedChildCards];
    this._cachedChildCards = undefined;
    return res;
  }

  childParentNoteDidMutate(
    local: boolean,
    oldValue: Note | undefined,
    child: Note,
  ): MutationPack {
    return this._invalidateChildCards(local);
  }

  // Invalidate our composite body if the title of an inner task are changes
  childTitleDidMutate(
    local: boolean,
    oldValue: RichText,
    child: Note,
  ): MutationPack {
    return this._invalidateBodyOnChildChange(local, child.key);
  }

  // Invalidate our composite body if the title of an inner task are changes
  childIsLoadingDidMutate(
    local: boolean,
    oldValue: RichText,
    child: Note,
  ): MutationPack {
    return this._invalidateBodyOnChildChange(local, child.key);
  }

  get dueDate(): Date | undefined {
    return this.record.get<Date>('dueDate');
  }

  set dueDate(d: Date | undefined) {
    if (d === undefined) {
      this.record.delete('dueDate');
    } else {
      const parentDueDate = this.parentNote?.dueDate;
      if (parentDueDate && parentDueDate.getTime() < d.getTime()) {
        d = parentDueDate;
      }
      this.record.set('dueDate', d);
    }
  }

  parentDueDateChanged(
    origin: MutationOrigin,
    oldValue: Date | undefined,
  ): MutationPack {
    if (!mutationSourceIsUser(origin)) {
      return;
    }
    const parentDueDate = this.parentNote?.dueDate;
    if (!parentDueDate) {
      return;
    }
    const dueDate = this.record.get<Date>('dueDate');
    if (!dueDate || dueDate.getTime() > parentDueDate.getTime()) {
      this.dueDate = parentDueDate;
      return ['dueDate', origin, dueDate];
    }
  }

  get title(): Document {
    if (typeof this._cachedTitle === 'undefined') {
      this._cachedTitle = docFromRT(this.titleRT);
    }
    return this._cachedTitle;
  }

  set title(rt: UnkeyedDocument) {
    this.titleRT = docToRT(rt);
  }

  clearTitle(): void {
    this.titleRT = initRichText();
  }

  titleDidMutate(local: boolean, oldValue: Document | undefined): MutationPack {
    this._cachedTitle = undefined;
    const prevPlaintextTitle = this._cachedPlaintextTitle;
    this._cachedPlaintextTitle = undefined;
    this._cachedTitleRT = undefined;
    return [['titlePlaintext', local, prevPlaintextTitle]];
  }

  private get titleRT(): RichText {
    if (!this._cachedTitleRT) {
      this._cachedTitleRT = reconstructRichText(
        stripFormattingFilter(
          flattenRichText(
            this.record.get('title') || initRichText(),
            true,
            false,
          ),
        ),
      );
    }
    return this._cachedTitleRT!;
  }

  private set titleRT(rt: RichText) {
    if (rt === undefined) {
      rt = initRichText();
    }
    rt = projectPointers(
      this.titleRT,
      rt,
      (ptr) => this.graph.ptrFilterFunc(ptr.key),
      true,
      true,
    );
    rt = reconstructRichText(
      stripFormattingFilter(flattenRichText(rt, true, false)),
    );
    this._cachedTitle = undefined;
    this._cachedTitleRT = undefined;
    this.record.set('title', rt);
  }

  titleRTDidMutate(
    local: boolean,
    oldValue: RichText | undefined,
  ): MutationPack {
    this._cachedTitle = undefined;
    const prevPlaintextTitle = this._cachedPlaintextTitle;
    this._cachedPlaintextTitle = undefined;
    this._cachedTitleRT = undefined;
    return [
      ['title', local, oldValue && docFromRT(oldValue)],
      ['titlePlaintext', local, prevPlaintextTitle],
    ];
  }

  get titlePlaintext(): string {
    if (!this._cachedPlaintextTitle) {
      this._cachedPlaintextTitle = treeToPlaintext(this.titleRT.root);
    }
    return this._cachedPlaintextTitle;
  }

  set titlePlaintext(str: string) {
    const updatedRT: RichText = {
      root: {
        children: [
          {
            tagName: 'p',
            children: [
              {
                text: str,
              },
            ],
          },
        ],
      },
    };
    const finalRT = projectPointers(this.titleRT, updatedRT, () => true);
    this.titleRT = finalRT;
    this._cachedPlaintextTitle = undefined;
  }

  get parentNote(): Note | undefined {
    const parentKey = this.record.get('parentNote');
    const graph = this.graph;
    const res =
      parentKey !== undefined && graph.hasVertex(parentKey)
        ? graph.getVertex<Note>(parentKey)
        : undefined;
    return res && res instanceof Note ? res : undefined;
  }

  set parentNote(parent: Note | undefined) {
    this.record.set('parentNote', parent?.key);
  }

  get status(): NoteStatus {
    if (this.isChecked) {
      return NoteStatus.Checked;
    }
    return this.record.get('status', NoteStatus.Unchecked);
  }

  set status(status: NoteStatus) {
    this.record.set('status', status);
    const tags = this.tags;
    for (const parentTag of tags.keys()) {
      if (parentTag.name === 'Status') {
        tags.delete(parentTag);
        break;
      }
    }
    this.tags = tags;
  }

  get isChecked(): boolean {
    return computeCheckedForNote(
      this.type,
      this.record.get('status'),
      this.tags,
      this.childCards,
    );
  }

  set isChecked(flag: boolean) {
    this.proxy.status = flag ? NoteStatus.Checked : NoteStatus.Unchecked;
  }

  get completionDate(): Date | undefined {
    return this.record.get('completionDate');
  }

  set completionDate(d: Date | undefined) {
    if (d) {
      this.record.set('completionDate', d);
    } else {
      this.record.delete('completionDate');
    }
  }

  statusDidMutate(
    local: boolean,
    oldValue: NoteStatus | undefined,
  ): MutationPack {
    const completionDate = this.completionDate;
    if (this.isChecked) {
      if (!this.completionDate) {
        this.completionDate = new Date();
      }
    } else {
      delete this.completionDate;
    }
    const result: MutationPack = [
      [
        'isChecked',
        local,
        computeCheckedForNote(this.type, oldValue, this.tags, this.childCards),
      ],
    ];
    if (this.completionDate !== completionDate) {
      result.push(['completionDate', local, completionDate]);
    }
    return result;
  }

  get dynamicTags(): Dictionary<Tag, Tag> {
    const result = new Map<Tag, Tag>();
    // const priorityTag = this.workspace.priorityTag;
    // if (priorityTag) {
    //   const priorityValues = priorityTag.childTags;
    //   if (priorityValues.length > 0) {
    //     result.set(priorityTag, priorityValues[0]);
    //   }
    // }
    return result;
  }

  get tags(): Dictionary<Tag, Tag> {
    const map: Dictionary | undefined = this.record.get('tags');
    const result: Dictionary<Tag, Tag> =
      map === undefined ? new Map() : keyDictToVertDict(this.graph, map);
    for (const [parent, child] of this.dynamicTags) {
      if (!result.has(parent)) {
        result.set(parent, child);
      }
    }
    return result;
  }

  set tags(map: Dictionary<Tag, Tag>) {
    const persistentMap: Dictionary<Tag, Tag> = new Map(map);
    for (const [parent, child] of this.dynamicTags) {
      if (persistentMap.get(parent) === child) {
        persistentMap.delete(parent);
      }
    }
    this.record.set('tags', vertDictToKeyDict(persistentMap));
  }

  clearTags(): void {
    this.tags = new Map();
  }

  get type(): NoteType {
    return this.record.get('type') as NoteType;
  }

  set type(type: NoteType) {
    this.record.set('type', type);
  }

  get parentType(): NoteType | undefined {
    return this.parentNote?.type;
  }

  get isDeleted(): number {
    const sup = super.isDeleted;
    if (sup !== 0) {
      return sup;
    }
    const parentNote = this.parentNote;
    if (!parentNote) {
      return 0;
    }
    if (!parentNote.bodyRefs.has(this.key)) {
      return 1;
    }
    return 0;
  }

  set isDeleted(v: number) {
    super.isDeleted = v;
  }

  parentBodyRefsDidMutate(
    local: boolean,
    oldValue: Set<string> | undefined,
  ): MutationPack {
    const hadRef = (oldValue && oldValue.has(this.key)) === true;
    if (!oldValue || hadRef !== this.parentNote?.bodyRefs.has(this.key)) {
      return ['isDeleted', local, !hadRef];
    }
  }

  parentNoteTypeDidMutate(
    local: boolean,
    oldValue: NoteType | undefined,
  ): MutationPack {
    if ((oldValue || NoteType.Note) !== this.parentType) {
      return ['parentType', local, oldValue];
    }
  }

  get isPinned(): boolean {
    return this.record.get('pinnedBy').has(this.graph.rootKey);
  }

  set isPinned(val: boolean) {
    const current = SetUtils.map(this.pinnedBy, (x) => x);
    if (val) {
      current.add(this.graph.rootKey);
    } else if (current.has(this.graph.rootKey)) {
      current.delete(this.graph.rootKey);
    }

    this.pinnedBy = current;
  }

  get pinnedBy(): Set<string> {
    return this.record.get('pinnedBy');
  }

  set pinnedBy(pins: Set<string>) {
    this.record.set('pinnedBy', pins);
  }

  pinnedByDidMutate(local: boolean, oldValue: Set<string>): MutationPack {
    return ['isPinned', local, oldValue?.has(this.graph.rootKey)];
  }

  childNoteIsDeletedDidMutate(
    local: boolean,
    oldValue: number,
    child: Note,
  ): MutationPack {
    if ((oldValue === 1) !== (child.isDeleted === 1)) {
      return mutationPackAppend(
        // TODO: Actually go and remove the RefMarkers from the rich text
        // this._invalidateBodyOnChildChange(local, child.key),
        this._invalidateChildCards(local),
      );
    }
  }

  rewritePinsToRootUser(): void {
    const pinnedBy = this.pinnedBy;
    if (pinnedBy && pinnedBy.has('/')) {
      const updatedPins = new Set(pinnedBy);
      updatedPins.delete('/');
      updatedPins.add(this.graph.rootKey);
      this.pinnedBy = updatedPins;
    }
  }

  // tagsDidMutate(
  //   source: MutationOrigin,
  //   oldValue: Dictionary<Tag, Tag> | undefined
  // ): MutationPack {
  //   let result: MutationPack;
  //   const oldChecked = computeCheckedForNote(
  //     this.type,
  //     this.status,
  //     oldValue,
  //     this.childCards
  //   );
  //   if (oldChecked !== this.isChecked) {
  //     result = mutationPackAppend(result, ['isChecked', source, oldChecked]);
  //   }
  //   return result;
  // }

  childCardsDidMutate(
    local: boolean,
    oldValue: Note[] | undefined,
  ): MutationPack {
    const oldChecked = computeCheckedForNote(
      this.type,
      this.status,
      this.tags,
      oldValue,
    );
    if (oldChecked !== this.isChecked) {
      return ['isChecked', local, oldChecked];
    }
  }

  childStatusDidMutate(
    local: boolean,
    oldValue: NoteStatus,
    child: Note,
  ): MutationPack {
    const childCards = this.childCards;
    if (!childCards.length) {
      return;
    }
    if (this.type === NoteType.Note) {
      const firstChecked = childCards[0].isChecked;
      let childrenMatch = true;
      for (let i = 1; i < childCards.length; ++i) {
        const c = childCards[i];
        if (c === child) {
          continue;
        }
        if (c.isChecked !== firstChecked) {
          childrenMatch = false;
          break;
        }
      }
      let result: MutationPack;
      if (childrenMatch) {
        result = mutationPackAppend(result, ['isChecked', local, oldValue]);
      }
      return mutationPackAppend(
        result,
        this._invalidateBodyOnChildChange(local, child.key),
      );
    }
  }

  valueForRefCalc(fieldName: keyof this): any {
    if (fieldName === 'status') {
      return kNoRefsValue;
    }
    return super.valueForRefCalc(fieldName);
  }
}

const kStripWhitelinesReges = /[\r\n]\s*/g;
function stripWhitelines(str: string): string {
  return str.replace(kStripWhitelinesReges, ' ');
}

function computeCheckedForNote(
  type: NoteType,
  status: NoteStatus | undefined,
  tags: Dictionary<Tag, Tag> | undefined,
  childCards: Note[] | undefined,
): boolean {
  if (type === NoteType.Task) {
    if (status === NoteStatus.Checked) {
      return true;
    }
    if (!tags) {
      return false;
    }
    for (const [parent, child] of tags) {
      if (parent.isDeleted || child.isDeleted) {
        continue;
      }
      if (parent.name === 'Status' && child.name === 'Done') {
        return true;
      }
    }
    return false;
  } else if (type === NoteType.Note) {
    if (!childCards || !childCards.length) {
      return false;
    }
    for (const child of childCards) {
      if (child.isDeleted) {
        continue;
      }
      if (
        !computeCheckedForNote(
          child.type,
          child.status,
          child.tags,
          child.childCards,
        )
      ) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export const NOTE_SORT_BY: Record<SortBy, SortDescriptor<Note>> = {
  [SortBy.CreatedDescending]: (a, b) =>
    b.creationDate.getTime() - a.creationDate.getTime() ||
    coreValueCompare(b, a),
  [SortBy.CreatedAscending]: (a, b) =>
    a.creationDate.getTime() - b.creationDate.getTime() ||
    coreValueCompare(a, b),
  [SortBy.DueDateAscending]: (a, b) => {
    if (!a.dueDate && !b.dueDate) {
      return coreValueCompare(a, b);
    }
    if (!a.dueDate && b.dueDate) {
      return 1;
    }
    if (a.dueDate && !b.dueDate) {
      return -1;
    }

    const dt = a.dueDate!.getTime() - b.dueDate!.getTime();
    if (dt !== 0) {
      return dt;
    }
    return coreValueCompare(a, b);
  },
  [SortBy.DueDateDescending]: (a, b) => {
    if (!a.dueDate && !b.dueDate) {
      return coreValueCompare(a, b);
    }
    if (!a.dueDate && b.dueDate) {
      return -1;
    }
    if (a.dueDate && !b.dueDate) {
      return 1;
    }

    const dt = b.dueDate!.getTime() - a.dueDate!.getTime();
    if (dt !== 0) {
      return dt;
    }
    return coreValueCompare(b, a);
  },
  [SortBy.LastModifiedDescending]: (a, b) =>
    b.lastModified.getTime() - a.lastModified.getTime() ||
    coreValueCompare(b, a),
  [SortBy.LastModifiedAscending]: (a, b) =>
    a.lastModified.getTime() - b.lastModified.getTime() ||
    coreValueCompare(a, b),
  [SortBy.TitleAscending]: (a, b) => {
    const n1 = parseFloat(a.titlePlaintext);
    const n2 = parseFloat(b.titlePlaintext);
    if (!isNaN(n1) && !isNaN(n2) && n1 !== n2) {
      return n1 - n2;
    }
    return (
      coreValueCompare(a.titlePlaintext, b.titlePlaintext) ||
      coreValueCompare(a, b)
    );
  },
  [SortBy.TitleDescending]: (a, b) => {
    const n1 = parseFloat(a.titlePlaintext);
    const n2 = parseFloat(b.titlePlaintext);
    if (!isNaN(n1) && !isNaN(n2) && n1 !== n2) {
      return n2 - n1;
    }
    return (
      coreValueCompare(b.titlePlaintext, a.titlePlaintext) ||
      coreValueCompare(b, a)
    );
  },
};

const kFieldTriggersNote: FieldTriggers<Note> = {
  title: triggerParent(
    'childTitleDidMutate',
    'Note_title',
    SchemeNamespace.NOTES,
  ),
  // Note: Any trigger installed by a superclass gets automatically triggered
  // before these triggers
  isDeleted: triggerParent(
    'childNoteIsDeletedDidMutate',
    'Note_isDeleted',
    SchemeNamespace.NOTES,
  ),
  parentNote: triggerParent(
    'childParentNoteDidMutate',
    'Note_parentNote',
    SchemeNamespace.NOTES,
  ),
  type: triggerChildren(
    'parentNoteTypeDidMutate',
    'Note_type',
    SchemeNamespace.NOTES,
  ),
  status: triggerParent(
    'childStatusDidMutate',
    'Note_status',
    SchemeNamespace.NOTES,
  ),
  dueDate: triggerChildren('parentDueDateChanged', 'Note_dueDate', {
    namespace: SchemeNamespace.NOTES,
    // condition: (note, mutation) => {
    //   const ret =
    //     typeof note.dueDate !== 'undefined' &&
    //     mutation[2] instanceof Date &&
    //     note.dueDate.getTime() < mutation[2].getTime();
    //   return ret;
    // },
  }),
  assignees: triggerChildren(
    'parentAssigneesDidMutate',
    'Note_assignees',
    SchemeNamespace.NOTES,
  ),
  bodyRefs: triggerChildren(
    'parentBodyRefsDidMutate',
    'Note_bodyRefs',
    SchemeNamespace.NOTES,
  ),
};

Vertex.registerFieldTriggers(Note, kFieldTriggersNote);
