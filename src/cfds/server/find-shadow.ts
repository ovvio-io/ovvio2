import { versionOf, wcOf } from './path-utils';
import * as ServerErrors from './errors';
import { Record } from '../base/record';
import { DiffSyncState, Edit } from '../base/ds-state';
import { RequestContext } from './request-context';
import { RecordTransaction } from './record-db';

export async function findShadow(
  context: RequestContext,
  wc: Record,
  tran: RecordTransaction
): Promise<[Record | undefined, Edit[], boolean]> {
  const recordDB = context.recordDB;

  let clientEdits = context.edits!;

  if (wc.serverVersion === 0) {
    context.infoLog(
      'WC not created on the previous sync. can apply all edits',
      { type: 'incoming_sync_missing' }
    );

    return [undefined, clientEdits, true];
  }

  const key = context.key;
  const version = context.version || 0;
  const cEditsLength = clientEdits.length;

  let shadow: Record | undefined;

  if (version === wc.serverVersion) {
    shadow = wc.clone();
  } else if (version === 0) {
    shadow = Record.nullRecord();
    shadow.upgradeScheme(wc.scheme);
  } else {
    shadow = await recordDB.getRecord(versionOf(key, version));
  }

  if (!shadow) {
    throw ServerErrors.notFound(`Record: ${key}:${version} not found`);
  }

  //Check WC

  let versionReads = 0;
  const wcEdits = await tran.getRecordEdits(wcOf(key));
  clientEdits = matchEdits(context, shadow, wc, true, clientEdits, wcEdits);

  if (clientEdits.length === cEditsLength) {
    //No Changes found in wc, will check other shadows
    if (version < wc.serverVersion) {
      let tempV = version + 1;

      while (tempV < wc.serverVersion && clientEdits.length > 0) {
        const [recVersion, recEdits] = await recordDB.getRecordWithEdits(
          versionOf(key, tempV)
        );
        versionReads++;
        if (recVersion === undefined) {
          throw ServerErrors.notFound(`Record: ${key}:${recVersion} not found`);
        }

        clientEdits = matchEdits(
          context,
          shadow,
          recVersion,
          false,
          clientEdits,
          recEdits
        );

        tempV++;
      }
    }
  }

  if (clientEdits.length === 0) {
    const syncState = new DiffSyncState(false);
    syncState.setState(wc, shadow);

    const retEdits = syncState.captureDiff();

    context.infoLog(
      `All Client edits were synced. WC version: ${wc.serverVersion}, Shadow version: ${shadow.serverVersion}. found ${retEdits.length} remote edits for client`,
      {
        type: 'outgoing_sync_missing',
        versionReads,
      }
    );

    return [shadow, retEdits, false];
  }

  if (cEditsLength === clientEdits.length) {
    context.infoLog(
      `All Client edits weren't synced. WC version: ${wc.serverVersion}, Shadow version: ${shadow.serverVersion}. ${clientEdits.length} remaining edits to apply`,
      {
        type: 'incoming_sync_missing',
        versionReads,
      }
    );
  } else {
    context.infoLog(
      `Some Client edits weren't synced. WC version: ${wc.serverVersion}, Shadow version: ${shadow.serverVersion}. ${clientEdits.length} remaining edits to apply`,
      {
        type: 'outgoing_sync_missing',
        versionReads,
      }
    );
  }

  return [shadow, clientEdits, true];
}

function matchEdits(
  context: RequestContext,
  shadow: Record,
  curRecord: Record,
  isWC: boolean,
  cEdits: Edit[],
  rEdits: Edit[] | undefined
) {
  let editsI = 0;
  editsI = matchClientEdits(editsI, curRecord, cEdits);
  editsI = matchRemoteEdits(editsI, cEdits, rEdits);

  if (editsI > 0) {
    const editsCS = cEdits.slice(0, editsI);

    for (const edit of editsCS) {
      shadow.patch(edit.changes);
    }

    context.infoLog(
      `Found shadow match in ${isWC ? 'WC' : 'Prev'} version: ${
        curRecord.serverVersion
      }. the following edits are already applied: ${editsCS
        .map(x => x.dstChecksum)
        .join(', ')}. ${cEdits.length - editsI} left.`
    );

    cEdits = cEdits.slice(editsI);
  }
  return cEdits;
}

function matchClientEdits(editsI: number, curRecord: Record, edits: Edit[]) {
  for (let i = editsI; i < edits.length; i++) {
    if (edits[i].retry && edits[i].dstChecksum === curRecord.checksum) {
      editsI = i + 1;
      break;
    }
  }
  return editsI;
}

function matchRemoteEdits(
  editsI: number,
  cEdits: Edit[],
  rEdits: Edit[] | undefined
) {
  if (!rEdits) return editsI;
  let found = false;

  do {
    found = false;
    for (let i = editsI; i < cEdits.length; i++) {
      if (
        cEdits[i].retry &&
        rEdits.some(r => cEdits[i].dstChecksum === r.dstChecksum)
      ) {
        editsI = i + 1;
        found = true;
        break;
      }
    }
  } while (found);

  return editsI;
}
