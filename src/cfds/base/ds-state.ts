import { assert } from '../../base/error.ts';
import { Record } from './record.ts';
import {
  anyChanges,
  concatChanges,
  DataChanges,
  DecodedDataChange,
  decodedDataChanges,
} from './object.ts';
import { Scheme } from './scheme.ts';
import { JSONValue, ReadonlyJSONObject } from '../../base/interfaces.ts';
import {
  JSONDecoder,
  JSONEncoder,
} from '../../base/core-types/encoding/json.ts';
import {
  ConstructorDecoderConfig,
  Decoder,
  isDecoderConfig,
} from '../../base/core-types/encoding/index.ts';
import { Encodable, Encoder } from '../../base/core-types/index.ts';

/**
 * A single set of changes that should be applied to a specific record.
 * Two checksums are supplied alongside the changes - source and destination.
 * The source checksum is of the document from which the diff was originally
 * computed. The destination checksum is of the document after the changes have
 * been applied.
 *
 * An optional scheme object is included which, if present, represents a
 * request to update the record's scheme.
 */
export interface EditConfig {
  changes: DataChanges;
  srcChecksum: string;
  dstChecksum: string;
  scheme?: Scheme;
  retry?: boolean;
}

export interface EncodedEdit {
  c: DecodedDataChange;
  sc: string;
  dc: string;
  s?: ReadonlyJSONObject;
  rt?: boolean;
}

export class Edit implements Encodable {
  readonly changes: DataChanges;
  readonly srcChecksum: string;
  readonly dstChecksum: string;
  readonly scheme?: Scheme;
  private _retry?: boolean;

  constructor(config: EditConfig | ConstructorDecoderConfig<EncodedEdit>) {
    if (isDecoderConfig(config)) {
      const decoder = config.decoder;

      this.changes = decodedDataChanges(decoder.get<DecodedDataChange>('c')!);
      this.srcChecksum = decoder.get<string>('sc')!;
      this.dstChecksum = decoder.get<string>('dc')!;
      this.scheme = decoder.has('s')
        ? new Scheme({ decoder: decoder.get<Decoder>('s')! })
        : undefined;
      this._retry = decoder.get<boolean>('rt');
    } else {
      this.changes = config.changes;
      this.srcChecksum = config.srcChecksum;
      this.dstChecksum = config.dstChecksum;
      this.scheme = config.scheme;
      this._retry = config.retry;
    }
  }

  get retry() {
    return this._retry !== undefined ? this._retry : false;
  }

  markAsRetry() {
    this._retry = true;
  }

  get affectedKeys() {
    return Object.keys(this.changes);
  }

  toJS(): JSONValue {
    const encoder = new JSONEncoder();

    this.serialize(encoder);

    return encoder.getOutput();
  }

  serialize(encoder: Encoder): void {
    encoder.set('sc', this.srcChecksum);
    encoder.set('dc', this.dstChecksum);
    encoder.set('c', this.changes);
    encoder.set('s', this.scheme);
    if (this._retry !== undefined) encoder.set('rt', this._retry);
  }

  static fromJS(obj: ReadonlyJSONObject): Edit {
    const decoder = new JSONDecoder(obj);
    return new this({ decoder });
  }

  static editsContainField(edits: Iterable<Edit>, fieldName: string): boolean {
    for (const e of edits) {
      if (e.changes.hasOwnProperty(fieldName)) {
        return true;
      }
    }
    return false;
  }
}

export class DiffSyncState {
  private _isClient: boolean;
  pendingEdits: Edit[];
  wc: Record;
  shadow: Record;
  private _backup?: Record;

  constructor(isClient: boolean) {
    this._isClient = isClient;
    this.pendingEdits = [];

    this.wc = Record.nullRecord();
    this.shadow = Record.nullRecord();
    this._backup = isClient ? undefined : Record.nullRecord();
  }

  get isClient() {
    return this._isClient;
  }

  get backup() {
    return this._backup;
  }

  set backup(r) {
    if (this.isClient) {
      return;
    }
    this._backup = r;
  }

  get hasUnSyncedChanges(): boolean {
    return this.pendingEdits.length > 0 || !this.wc.isEqual(this.shadow);
  }

  setState(wc: Record, shadow: Record, backup?: Record): void {
    this.wc = wc;
    this.shadow = shadow;
    this.backup = backup;
    this.pendingEdits = [];
  }

  /**
   * Perform a full 3-way merge given a complete copy of our peer's WC.
   *
   * @param peerWc An up to date copy of our peer's WC.
   */
  mergePeerRecord(peerWc: Record): void {
    if (peerWc.isEqual(this.shadow)) {
      return;
    }
    peerWc = peerWc.clone();
    const localChanges = this.shadow.diff(this.wc, true);
    const newWc = this.shadow.clone();
    if (!newWc.scheme.isEqual(peerWc.scheme)) {
      newWc.upgradeScheme(peerWc.scheme);
    }
    const remoteChanges = this.shadow.diff(peerWc, false);
    newWc.patch(concatChanges(localChanges, remoteChanges));
    this.shadow = peerWc;
    this.wc = newWc;
    this.pendingEdits = [];
  }

  /**
   * Capture a diff of the current changes and store the resulting edit in the
   * edits stack. This method is called by clients periodically to speed up
   * diff calculation.
   *
   * WARNING: You must NEVER call this method during an active sync loop.
   */
  captureDiff(): Edit[] {
    // Algo step 1
    this.shadow.normalize();
    this.wc.normalize();
    const changes = this.shadow.diff(this.wc, false);
    if (anyChanges(changes)) {
      // Algo step 2
      this.pendingEdits.push(
        new Edit({
          changes,
          srcChecksum: this.shadow.checksum,
          dstChecksum: this.wc.checksum,
          scheme:
            (this.isClient && !this.shadow.scheme.isNull) ||
            this.shadow.scheme.isEqual(this.wc.scheme)
              ? undefined
              : this.wc.scheme, // Only the server is allowed to upgrade schemes
        })
      );
      // Algo step 3
      this.shadow = this.wc.clone();
    }
    return this.pendingEdits;
  }

  /**
   * Applies edits provided by our peer and updates the local edits stack
   * accordingly.
   */
  applyEdits(edits: Edit[] | undefined, context?: string): void {
    // Algo step 4: First, perform recovery if need (only in the server, NOP
    // in client).
    //edits = this._rollbackIfNeeded(edits);
    this.pendingEdits = [];
    if (!edits || edits.length === 0) {
      return;
    }
    const isClient = this.isClient;
    // At the end of this method we'll be performing a 3-way merge. The current
    // shadow will be the base of this merge.
    const mergeBase = this.shadow.clone();

    // Algo steps 5 + 6: starting from our current shadow, we'll now apply the
    // edits our peer has provided. This will eventually result in the current
    // version of the record that our peer currently holds.
    let peerVersion = this.shadow.clone();
    for (let i = 0; i < edits.length; i++) {
      const e = edits[i];

      peerVersion.normalize();
      // Make sure we're referring to the same start record
      assert(
        e.srcChecksum === peerVersion.checksum,
        `${context || ''}apply edits, index: ${i + 1}/${
          edits.length
        } - not referring to the same start record. edit.srcChecksum = ${
          e.srcChecksum
        }, peerVersion.checksum = ${peerVersion.checksum}`
      );
      // Perform scheme upgrade if needed
      if ((isClient || peerVersion.scheme.isNull) && e.scheme) {
        peerVersion.upgradeScheme(e.scheme);
      }
      // Patch
      peerVersion.patch(e.changes);
      // Sanity check - if the result doesn't match the expected checksum,
      // then something's wrong with our patch implementation.
      assert(
        e.dstChecksum === peerVersion.checksum,
        `${context || ''}apply edits, ${i + 1}/${
          edits.length
        } - something went wrong when applying edits. edit.dstChecksum = ${
          e.dstChecksum
        }, peerVersion.checksum = ${peerVersion.checksum}`
      );
    }

    // Algo step 7: before merging with our working copy, take a backup of our
    // peer's current shadow.
    this.shadow = peerVersion.clone();
    this.backup = peerVersion.clone();

    // Algo step 8: Merge with local working copy.
    // First, perform a scheme upgrade if needed. Clients pull scheme upgrades
    // from server, except for the initial null scheme.
    if (isClient || mergeBase.scheme.isNull) {
      if (!mergeBase.scheme.isEqual(peerVersion.scheme)) {
        mergeBase.upgradeScheme(peerVersion.scheme);
      }
    } else {
      // Server scheme upgrade
      if (!mergeBase.scheme.isEqual(this.wc.scheme)) {
        mergeBase.upgradeScheme(this.wc.scheme);
      }
    }
    // 3-way merge between the shadow we started this method with, the current
    // peer version, and our current working copy. This differs from the
    // original paper due to our patch implementation which requires an exact
    // merge base.
    const remoteEdits = mergeBase.diff(peerVersion, false);
    const localEdits = mergeBase.diff(this.wc, true);

    // Apply changes in order. With our current patch implementation the order
    // isn't critical for correctness, however this keeps things more stable
    // from the UIs point of view. Not keeping a consistent order will reorder
    // edits for some clients under some conditions which just looks weird.
    if (isClient) {
      mergeBase.patch(concatChanges(remoteEdits, localEdits));
    } else {
      mergeBase.patch(concatChanges(localEdits, remoteEdits));
    }
    mergeBase.assertValidData();
    // Algo step 9: Update our working copy with the merged results
    this.wc = mergeBase;
  }

  markLastEditAsRetry() {
    if (this.pendingEdits && this.pendingEdits.length > 0) {
      this.pendingEdits[this.pendingEdits.length - 1].markAsRetry();
    }
  }

  /**
   * Called from applyEdits() to resolve an edits stack against the current
   * state, and do a rollback if needed.
   */
  // private _rollbackIfNeeded(edits: Edit[] | undefined): Edit[] | undefined {
  //   if (!edits || !edits.length) {
  //     return undefined;
  //   }

  //   // In case of a lost response, our peer may transmit the exact same list of
  //   // edits that we've already received. This is effectively a NOP.
  //   const shadowChecksum = this.shadow.checksum;
  //   const lastEdit = Utils.Array.lastValue(edits);
  //   if (!lastEdit || lastEdit.dstChecksum === shadowChecksum) {
  //     return [];
  //   }

  //   // Find the first edit that matches our shadow's checksum. This effectively
  //   // skips edits that have already been applied (lost return packet).
  //   for (let i = 0; i < edits.length; ++i) {
  //     if (edits[i].srcChecksum === shadowChecksum) {
  //       return edits.slice(i);
  //     }
  //   }

  //   // Our shadow doesn't match any of the edits. Try to rollback to our backup
  //   if (!this.isClient) {
  //     if (this.backup) {
  //       const backupChecksum = this.backup.checksum;

  //       // Same case as lost response above, except here we had local edits
  //       // that weren't received.
  //       if (lastEdit.dstChecksum === backupChecksum) {
  //         this.shadow = this.backup.clone(); // Rollback
  //         this.pendingEdits = [];
  //         return [];
  //       }

  //       // Proper rollback procedure
  //       for (let i = 0; i < edits.length; ++i) {
  //         if (edits[i].srcChecksum === backupChecksum) {
  //           this.shadow = this.backup.clone();
  //           this.pendingEdits = [];
  //           return edits.slice(i);
  //         }
  //       }
  //     }
  //   }

  //   // If we got this far, the received edits don't match both our shadow and
  //   // backup. In this case we assume this is an old packet that arrived out of
  //   // order and just ignore it.
  //   //
  //   // WARNING: Theoretically, we can be handling with a future packet
  //   // originating in a broken sync look. If this is indeed the case, both ends
  //   // will continue unaware that they're out of sync and loose all changes.
  //   //
  //   // TODO (Ofri): Periodically send the local hash to ensure both ends are in
  //   // sync (or something similar).
  //   return undefined;
  // }
}
