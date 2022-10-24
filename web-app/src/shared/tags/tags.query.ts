import {
  QueryProvider,
  QueryHandle,
  BaseQueryProvider,
} from 'core/cfds/query-provider';
import { TagsTreeIndex, ChildTagsIndex } from 'core/cfds/indexes';
import { Tag } from '@ovvio/cfds/lib/client/graph/vertices';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';

export interface TagTreeParams {
  workspaceKey: string;
}

export class TagGroup {
  private _pTagMng: VertexManager<Tag>;
  private _cManagers: VertexManager<Tag>[];

  constructor(pTagMng: VertexManager<Tag>) {
    this._pTagMng = pTagMng;
    this._cManagers = [];
  }

  get parentTagMng() {
    return this._pTagMng;
  }

  get parentTag() {
    return this._pTagMng.getVertexProxy();
  }

  get children(): readonly Tag[] {
    return this._cManagers.map(m => m.getVertexProxy());
  }

  get childMangers() {
    return this._cManagers;
  }

  addChild(cMng: VertexManager<Tag>) {
    this._cManagers.push(cMng);
  }
}

export interface ITagItem {
  readonly tag: Tag;
  readonly parentTag?: Tag;
  readonly parentTagMng?: VertexManager<Tag>;
  readonly parentKey: string;
  readonly key: string;
  readonly vertices: Tag[];
}

export class TagItem implements ITagItem {
  private _tagMng: VertexManager<Tag>;

  constructor(tagMng: Tag | VertexManager<Tag>) {
    this._tagMng =
      tagMng instanceof Tag ? (tagMng.manager as VertexManager<Tag>) : tagMng;
  }

  get tag() {
    return this._tagMng.getVertexProxy();
  }

  get parentTag() {
    return this.tag.parentTag;
  }

  get parentTagMng(): VertexManager<Tag> | undefined {
    return this.parentTag?.manager as VertexManager<Tag>;
  }

  get vertices() {
    const pTag = this.parentTag;
    if (pTag) {
      return [this.tag, pTag];
    }
    return [this.tag];
  }

  get key() {
    return this._tagMng.key;
  }

  get parentKey() {
    return (this.parentTag || this.tag).key;
  }
}

export class TagTree {
  private _groups: TagGroup[];
  private _leaves?: TagItem[];

  constructor(groups: TagGroup[]) {
    this._groups = groups;
  }

  get parents() {
    return this._groups;
  }

  get leaves(): ITagItem[] {
    if (this._leaves === undefined) {
      this._leaves = [];
      for (const g of this._groups) {
        if (g.children.length === 0) {
          this._leaves.push(new TagItem(g.parentTagMng));
        } else {
          for (const cMng of g.childMangers) {
            this._leaves.push(new TagItem(cMng));
          }
        }
      }
    }
    return this._leaves;
  }

  static empty() {
    return new TagTree([]);
  }
}

export class TagsTreeQueryProvider extends BaseQueryProvider<
  TagTreeParams,
  TagTree
> {
  buildQuery(params: TagTreeParams): QueryHandle {
    const query = this.query(
      this.index<Tag>(TagsTreeIndex).eq(params.workspaceKey)
    );
    query.name = 'TagsTreeQueryProvider';
    query.listen(q => {
      let group: TagGroup | undefined;
      const groups: TagGroup[] = [];

      for (const tagMng of q.cursor.readAll()) {
        if (group === undefined) {
          //Parent
          group = new TagGroup(tagMng);
          continue;
        }

        const tag = tagMng.getVertexProxy();

        const parent = tag.parentTag;
        if (parent && parent.key === group.parentTag.key) {
          group.addChild(tagMng);
        } else {
          //new group
          groups.push(group);
          group = new TagGroup(tagMng);
        }
      }

      //Left over
      if (group) groups.push(group);

      const tagTree = new TagTree(groups);
      this.notifyChange(tagTree);
    });

    return {
      close() {
        query.removeAllListeners();
      },
    };
  }
}

export interface ChildTagsParam {
  workspaceKey: string;
  parentTagKey?: string;
}
export class ChildTagsQueryProvider extends QueryProvider<ChildTagsParam, Tag> {
  buildQuery(params: ChildTagsParam): QueryHandle {
    const path = `${params.workspaceKey}/${params.parentTagKey}`;
    const query = this.query(this.index(ChildTagsIndex).eq(path));
    query.name = 'ChildTagsQueryProvider ' + path;

    query.listen(q => {
      this.notifyChange({
        vertexManagers: q.cursor.readAllToArray(),
      });
    });

    return {
      close() {
        query.removeAllListeners();
      },
    };
  }
}
