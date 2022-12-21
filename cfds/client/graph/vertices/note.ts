import { User } from './user.ts';
import { ContentVertex } from './base.ts';
import {
  AttachmentData,
  NoteStatus,
  NS_NOTES,
  SchemeNamespace,
} from '../../../base/scheme-types.ts';
import { initRichText, RichText } from '../../../richtext/tree.ts';
import {
  composeRichText,
  decomposeRichText,
  extractRefs,
  RefPlaceholder,
} from '../../../richtext/composer.ts';
import {
  FieldTriggers,
  keyDictToVertDict,
  vertDictToKeyDict,
  Vertex,
  VertexConfig,
} from '../vertex.ts';
import { Dictionary } from '../../../../base/collections/dict.ts';
import { Tag } from './tag.ts';
import { MutationPack, mutationPackAppend } from '../mutations.ts';
import {
  docFromRT,
  docToRT,
  Document,
  projectRanges,
  UnkeyedDocument,
} from '../../../richtext/doc-state.ts';
import { coreObjectClone } from '../../../../base/core-types/clone.ts';
import {
  flattenRichText,
  projectPointers,
  reconstructRichText,
  stripFormattingFilter,
} from '../../../richtext/flat-rep.ts';
import { treeToMarkdown } from '../../../richtext/markdown.ts';
import { triggerParent, triggerChildren } from '../propagation-triggers.ts';
import { coreValueEquals } from '../../../../base/core-types/index.ts';
import { VertexManager } from '../vertex-manager.ts';
import { Record } from '../../../base/record.ts';
import { notReached, assert } from '../../../../base/error.ts';
import * as SetUtils from '../../../../base/set.ts';

export enum NoteType {
  Task = 'task',
  Note = 'note',
}

export class Note extends ContentVertex {
  private _cachedBody?: Document;
  private _cachedBodyPreview?: string;
  private _cachedTitle?: Document;
  private _cachedTitleRT?: RichText;
  private _cachedChildCards?: Note[];

  constructor(
    mgr: VertexManager,
    record: Record,
    prevVertex: Vertex | undefined,
    config: VertexConfig | undefined
  ) {
    super(mgr, record, prevVertex, config);
    if (
      prevVertex instanceof Note &&
      coreValueEquals(this.body, prevVertex.body)
    ) {
      this._cachedBodyPreview = prevVertex._cachedBodyPreview;
    }
  }

  get parent(): Vertex | undefined {
    return this.parentNote || super.parent;
  }

  parentNoteDidMutate(
    local: boolean,
    oldValue: Note | undefined
  ): MutationPack {
    return [
      ['parent', local, oldValue],
      ['parentType', local, oldValue?.type],
    ];
  }

  get assignees(): Set<User> {
    return this.vertSetForField('assignees');
  }

  set assignees(users: Set<User>) {
    this.record.set(
      'assignees',
      SetUtils.map(users, (u) => u.key)
    );
  }

  clearAssignees(): void {
    this.record.set('assignees', new Set());
  }

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
          true
        )
      );
    }
    return this._cachedBody;
  }

  set body(rt: UnkeyedDocument) {
    // Take a snapshot of the out refs before changing the value
    const oldRefs = this.getBodyRefs();
    rt = projectRanges(this.body, rt, (ptr) =>
      this.graph.ptrFilterFunc(ptr.key)
    );
    this._cachedBody = undefined;
    const graph = this.graph;
    //  Update our body while applying edits to inner tasks' titles
    const updatedBody = decomposeRichText(
      (key, rt) => {
        let childV: Note;
        if (!oldRefs.has(key)) {
          if (graph.hasVertex(key)) {
            //This was a deleted task.
            childV = graph.getVertex<Note>(key);
            childV.isDeleted = 0;
          } else {
            //New Task
            childV = graph.createVertex(
              NS_NOTES,
              {
                creationDate: new Date(),
                parentNote: this.key,
                type: NoteType.Task,
                createdBy: this.createdBy?.key,
                workspace: this.workspace.key,
              },
              key
            );
          }
        } else {
          //Existing task
          childV = graph.getVertex<Note>(key);
        }
        childV.titleRT = rt;
      },
      docToRT(rt),
      true
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

  getBodyRefs(): Set<string> {
    const bodyRT = this.record.get<RichText>('body');
    if (bodyRT === undefined) {
      return new Set();
    }
    return extractRefs(bodyRT.root, true);
  }

  getRawBody(): RichText | undefined {
    return this.record.get<RichText>('body');
  }

  get bodyPreview(): string {
    if (this._cachedBodyPreview === undefined) {
      this._cachedBodyPreview = stripWhitelines(treeToMarkdown(this.body.root));
    }
    return this._cachedBodyPreview;
  }

  bodyDidMutate(local: boolean, oldValue: Document): MutationPack {
    this._cachedBodyPreview = undefined;
    this._cachedBody = undefined;
    return [
      'bodyPreview',
      local,
      stripWhitelines(treeToMarkdown(oldValue?.root)),
    ];
  }

  private _invalidateBodyOnChildChange(
    local: boolean,
    childKey: string
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
      const childCards: Note[] = [];
      for (const child of this.getChildren<Note>(SchemeNamespace.NOTES)) {
        if (!child.isDeleted) {
          childCards.push(child);
        }
      }
      this._cachedChildCards = childCards;
    }
    return this._cachedChildCards;
  }

  private _invalidateChildCards(local: boolean): MutationPack {
    const res: MutationPack = ['childCards', local, this._cachedChildCards];
    this._cachedChildCards = undefined;
    return res;
  }

  childParentNoteDidMutate(
    local: boolean,
    oldValue: Note | undefined,
    child: Note
  ): MutationPack {
    return this._invalidateChildCards(local);
  }

  // Invalidate our composite body if the title of an inner task are changes
  childTitleDidMutate(
    local: boolean,
    oldValue: RichText,
    child: Note
  ): MutationPack {
    return this._invalidateBodyOnChildChange(local, child.key);
  }

  // Invalidate our composite body if the title of an inner task are changes
  childIsLoadingDidMutate(
    local: boolean,
    oldValue: RichText,
    child: Note
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
      this.record.set('dueDate', d);
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

  private get titleRT(): RichText {
    if (!this._cachedTitleRT) {
      this._cachedTitleRT = reconstructRichText(
        stripFormattingFilter(
          flattenRichText(
            this.record.get('title') || initRichText(),
            true,
            false
          )
        )
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
      true
    );
    rt = reconstructRichText(
      stripFormattingFilter(flattenRichText(rt, true, false))
    );
    this._cachedTitle = undefined;
    this._cachedTitleRT = undefined;
    this.record.set('title', rt);
  }

  titleRTDidMutate(local: boolean, oldValue: RichText): MutationPack {
    this._cachedTitle = undefined;
    this._cachedTitleRT = undefined;
    return ['title', local, docFromRT(oldValue)];
  }

  get parentNote(): Note | undefined {
    const parentKey = this.record.get<string>('parentNote');
    return parentKey !== undefined
      ? this.graph.getVertex<Note>(parentKey)
      : undefined;
  }

  set parentNote(parent: Note | undefined) {
    this.record.set('parentNote', parent?.key);
  }

  get status(): NoteStatus {
    let status = this.record.get('status', NoteStatus.ToDo);
    if (status < NoteStatus.ToDo || status >= NoteStatus.kMNaxValue) {
      status = NoteStatus.ToDo;
    }
    return status;
  }

  set status(status: NoteStatus) {
    status = Math.max(
      NoteStatus.ToDo,
      Math.min(NoteStatus.kMNaxValue - 1, status)
    );
    this.record.set('status', status);
  }

  clearStatus(): void {
    this.status = NoteStatus.ToDo;
  }

  get tags(): Dictionary<Tag, Tag> {
    const map = this.record.get<Map<string, string>>('tags');
    return map === undefined ? new Map() : keyDictToVertDict(this.graph, map);
  }

  set tags(map: Dictionary<Tag, Tag>) {
    this.record.set('tags', vertDictToKeyDict(map));
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

  parentNoteTypeDidMutate(
    local: boolean,
    oldValue: NoteType | undefined
  ): MutationPack {
    return ['parentType', local, oldValue];
  }

  get isPinned(): boolean {
    return this.record.get<Set<string>>('pinnedBy').has(this.graph.rootKey);
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
    child: Note
  ): MutationPack {
    return mutationPackAppend(
      // TODO: Actually go and remove the RefMarkers from the rich text
      this._invalidateBodyOnChildChange(local, child.key),
      this._invalidateChildCards(local)
    );
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
}

const kStripWhitelinesReges = /[\r\n]\s*/g;
function stripWhitelines(str: string): string {
  return str.replace(kStripWhitelinesReges, ' ');
}

export const kFieldTriggersNote: FieldTriggers<Note> = {
  title: triggerParent('childTitleDidMutate', SchemeNamespace.NOTES),
  // Note: Any trigger installed by a superclass gets automatically triggered
  // before these triggers
  // isLoading: triggerParent('childIsLoadingDidMutate', SchemeNamespace.NOTES),
  isDeleted: triggerParent(
    'childNoteIsDeletedDidMutate',
    SchemeNamespace.NOTES
  ),
  parentNote: triggerParent('childParentNoteDidMutate', SchemeNamespace.NOTES),
  type: triggerChildren('parentNoteTypeDidMutate', SchemeNamespace.NOTES),
};

Vertex.registerFieldTriggers(Note, kFieldTriggersNote);
