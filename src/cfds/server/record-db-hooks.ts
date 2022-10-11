import { Record } from '../base/record';
import { globalVersionOf, RecordPath, versionOf } from './path-utils';
import { PathType, destRefOf } from './path-utils';
import {
  COLUMN_KEY,
  COLUMN_LAST_MOD_KEY,
  COLUMN_RECORD_KEY,
  COLUMN_RECORD_VERSION,
  COLUMN_REF_NS,
  COLUMN_USER_ID,
} from './record-db';
import { IACIDTransaction } from './stores/acid-store';
import { RowData, setTTL } from './stores/crud';
import { updateIndexes } from './record-index';
import { NoRetry } from '@ovvio/base/lib/utils/time';

const GLOBAL_INDEX_TTL_ADD = 1000 * 60 * 60 * 24 * 7 + 60 * 1000;

/**
 * Called before an update to the record
 */
export async function runPreHook(
  transaction: IACIDTransaction,
  rPath: RecordPath,
  record: Record,
  lastMod: Date | undefined
): Promise<void> {
  if (rPath.type !== PathType.WorkingCopy) return;

  //Remove Old Refs
  if (lastMod) {
    await Promise.all(
      Array.from(record.refs).map(ref => {
        const destKey = destRefOf(rPath.key, ref, lastMod);
        return transaction.delete(destKey.path);
      })
    );
  }

  //Versioning: Copy all of WC row data to new row by version
  const allRowData = await transaction.get(rPath.path);
  if (allRowData === undefined) {
    throw new NoRetry(
      `Get all row data for path: ${rPath.path} return nothing`
    );
  }
  if (allRowData[COLUMN_RECORD_VERSION] === undefined) {
    allRowData[COLUMN_RECORD_VERSION] = record.serverVersion.toString();
  }

  await transaction.update(versionOf(rPath.key, record.serverVersion).path, {
    setColumns: allRowData,
    createRow: true,
    replaceRow: true,
  });
}

/**
 * Run after the record update, but before the transaction is committed
 */
export async function runPostHook(
  transaction: IACIDTransaction,
  rPath: RecordPath,
  recordBefore: Record | undefined,
  recordAfter: Record | undefined,
  lastMod: Date | undefined,
  rowData?: RowData,
  forceUpdateIndexes = false
): Promise<void> {
  let wcPromises: Promise<any>[] | undefined;

  if (rPath.type === PathType.WorkingCopy) {
    wcPromises = [];
    if (recordAfter && lastMod) {
      //Add Refs with new lastMod time
      wcPromises.push(
        ...Array.from(recordAfter.refs).map(ref => {
          const destKey = destRefOf(rPath.key, ref, lastMod);

          const data = {
            [COLUMN_RECORD_KEY]: JSON.stringify(Record.nullRecord().toJS()),
            [COLUMN_REF_NS]: recordAfter.scheme.namespace,
          };

          return transaction.create(destKey.path, data);
        })
      );
    }

    //Update Record Indexes
    wcPromises = wcPromises.concat(
      updateIndexes(
        transaction,
        rPath.key,
        recordBefore,
        recordAfter,
        forceUpdateIndexes
      )
    );

    //Global Versions table
    if (rowData && recordAfter && lastMod) {
      const vData: RowData = {
        [COLUMN_KEY]: rPath.key,
        [COLUMN_LAST_MOD_KEY]: rowData[COLUMN_LAST_MOD_KEY],
        [COLUMN_RECORD_VERSION]: rowData[COLUMN_RECORD_VERSION],
      };
      if (rowData[COLUMN_USER_ID] !== undefined) {
        vData[COLUMN_USER_ID] = rowData[COLUMN_USER_ID];
      }
      const ttl = new Date(lastMod.getTime() + GLOBAL_INDEX_TTL_ADD);
      setTTL(vData, ttl);

      await transaction.update(
        globalVersionOf(rPath.key, recordAfter.serverVersion).path,
        {
          setColumns: vData,
          createRow: true,
          replaceRow: true,
        }
      );
    }
  }

  if (wcPromises) {
    await Promise.all(wcPromises);
  }
}
