import Utils from '@ovvio/base/lib/utils';
import { DiffSyncState, Edit } from '../base/ds-state';
import * as ServerErrors from './errors';
import { Record } from '../base/record';
import logger from '@ovvio/base/lib/logger';
import { RecordDB, RefInfo, compareRefInfo } from './record-db';
import {
  ListResponse,
  ListResult,
  RecordRequest,
  RecordResponse,
  RequestCommand,
  ServerContext,
} from './types';
import pathUtils, { RecordPath } from './path-utils';
import { ServerError, accessDenied, unknownCommand } from './errors';
import { NoRetry } from '@ovvio/base/lib/utils/time';
import ErrorDB from './error-db';
import { RequestContext } from './request-context';
import { findShadow } from './find-shadow';

// WARNING: Timeout value must be aligned with
// @ovvio/cfds/base/def.ts/kDMP.diffTimeout or clients may be locked
// out after a disconnect, unable to send pending edits.
const DEF_UPDATE_TIMEOUT_MS = 1000;

const HOT_KEY_INTERVAL_MS = 10 * 1000; // 10 sec
const CURSOR_CLOCK_OFFSET = 3 * 1000; // 3 sec

const EDIT_WITH_RETRY_TRAN_MS = 2500;

export enum ServerAccessMode {
  GET,
  SET,
}

export interface ServerOptions {
  updateTimeout?: number;
  gcRatio?: number;
  debugLog?: boolean;
}

export interface ServerInternalOptions {
  updateTimeout: number;
  gcRatio: number;
  cursorClockOffset: number;
  debugLog: boolean;
}

interface ApplyEditsResponse {
  timestamp?: Date;
  version?: number;
  edits: Edit[];
}

interface ApplyEditsTranResult {
  wc: Record;
  savedNew: boolean;
  edits?: Edit[];
}

export interface AuthValidator<TContext extends ServerContext = ServerContext> {
  (
    recordDB: RecordDB,
    key: string,
    wc: Record,
    context: TContext,
    mode: ServerAccessMode
  ): Promise<boolean>;
}

/**
 * A logical CFDS server. This class handles server logic backed by an external
 * eventually consistent key-value storage.
 *
 * This class doesn't handle any networking on its own and must be wrapped by
 * a networking layer.
 */
export class Server {
  private _recordDB: RecordDB;
  private _authValidator: AuthValidator;
  private _errorDB: ErrorDB;
  private _options: ServerInternalOptions;

  /**
   * Initializes a CFDS server.
   *
   * @param backend: A Storage instance which the server will use as a backend.
   *                 A subclass of @ovvio/cfds/server/storage/Storage.
   *
   * @param authValidator: An async function used to validate authorization
   *                       for clients. This function should return boolean
   *                       indicating allowed/denied, and is called with the
   *                       following parameters:
   *
   *                       key (str): The inspected key.
   *                       wc (Record): The latest working copy for this key.
   *                       ctx (obj): The context object passed by the caller.
   */
  constructor(
    recordDB: RecordDB,
    authValidator: AuthValidator,
    errorDB: ErrorDB,
    options?: ServerOptions
  ) {
    this._recordDB = recordDB;
    this._authValidator = authValidator;
    this._errorDB = errorDB;

    this._options = {
      updateTimeout: DEF_UPDATE_TIMEOUT_MS,
      gcRatio: Utils.EnvVars.getInt('DIFF_SERVER_GC_RATIO') || 1,
      cursorClockOffset: CURSOR_CLOCK_OFFSET,
      debugLog: false,
    };

    if (options) {
      this._options = Object.assign(this._options, options);
    }

    logger.info(`Server Options: ${JSON.stringify(this._options)}`);
  }

  /**
   * Returns the RecordDB instance backing this server.
   */
  get recordDB() {
    return this._recordDB;
  }

  get options() {
    return this._options;
  }

  async run(
    request: RecordRequest,
    context: ServerContext
  ): Promise<RecordResponse> {
    const reqContext = new RequestContext(
      this._recordDB,
      request,
      context,
      this._options.debugLog
    );

    reqContext.debugLog(
      `Starting request. id: ${request.id}, key: ${request.key}, cmd: request: ${request.cmd}, list: ${request.list}`,
      {
        type: 'requesting_starting',
      }
    );

    try {
      let response: RecordResponse;
      if (request.cmd === RequestCommand.GET) {
        response = await this.runGet(reqContext);
      } else {
        //SYNC
        if (request.list) {
          response = await this.runSyncList(reqContext);
        } else {
          response = await this.runSync(reqContext);
        }
      }
      reqContext.debugLog(
        `Request completed. id: ${request.id}, key: ${request.key}, cmd: request: ${request.cmd}, list: ${request.list}, edits: ${request.edits?.length}`,
        {
          type: 'requesting_completed',
        }
      );
      return response;
    } catch (error) {
      return this.handleError(error, reqContext);
    }
  }

  //////SYNC////////

  private async runSyncList(
    reqContext: RequestContext
  ): Promise<RecordResponse> {
    const [{ edits, version }, listResp] = await Promise.all([
      this.applyEdits(reqContext),
      this.list(reqContext.key, reqContext.cursor, reqContext),
    ]);

    return RecordResponse.sync(
      reqContext.key,
      reqContext.id,
      edits,
      version,
      listResp
    );
  }

  private async runSync(reqContext: RequestContext): Promise<RecordResponse> {
    const { edits, version } = await this.applyEdits(reqContext);
    return RecordResponse.sync(reqContext.key, reqContext.id, edits, version);
  }

  private async applyEdits(
    reqContext: RequestContext
  ): Promise<ApplyEditsResponse> {
    if (reqContext.editsLength === 0) {
      return await this.applyEmptyEdits(
        reqContext,
        reqContext.version,
        reqContext.checksum
      );
    }

    const key = reqContext.key;
    let version = reqContext.version || 0;
    let edits = reqContext.edits!;

    const recordDB = this._recordDB;
    const syncState = new DiffSyncState(false);

    let shadow: Record | undefined;

    const hasEditsWithRetry = edits.some(e => e.retry);

    const applyResult = await recordDB.txn<ApplyEditsTranResult>(
      reqContext.serverContext,
      async tran => {
        //Get WC if not gotten already
        let wc = await tran.getRecord(pathUtils.wcOf(key));
        if (wc === undefined) {
          if (version === 0) {
            wc = Record.nullRecord();
          } else {
            throw new NoRetry(
              ServerErrors.notFound(`Record: ${key}: WC not found`)
            );
          }
        }

        if (hasEditsWithRetry) {
          let needApply;
          [shadow, edits, needApply] = await findShadow(reqContext, wc, tran);

          if (!needApply) {
            await tran.abort();

            return {
              wc,
              savedNew: false,
              edits,
            };
          }
        }

        const accessCheckPromise = this.checkAccess(
          key,
          wc.isNull ? undefined : wc,
          reqContext,
          ServerAccessMode.SET
        );

        if (!shadow) {
          //Get Shadow by version
          if (version === wc.serverVersion) {
            //Shadow is same version as working copy no need to get it
            shadow = wc.clone();
          } else if (version === 0) {
            shadow = Record.nullRecord();
          } else {
            shadow = await recordDB.getRecord(
              pathUtils.versionOf(key, version)
            );
            if (shadow === undefined) {
              throw new NoRetry(
                ServerErrors.notFound(`Record: ${key}:${version} not found`)
              );
            }
          }
        }

        // Compute new record state
        syncState.setState(wc, shadow);

        try {
          syncState.applyEdits(edits);
        } catch (err: any) {
          const serverErr = unknownCommand(err, ServerErrors.Code.BadRequest);
          serverErr.internalInfo = {
            wcVersion: wc.serverVersion,
            shadowVersion: version,
            edits: edits ? edits.map(e => e.toJS()) : [],
          };
          throw new NoRetry(serverErr);
        }

        if (!(await accessCheckPromise)) {
          await tran.abort(accessDenied());
        }

        //Write Head as Working copy
        const newWC = await tran.updateRecord(
          pathUtils.wcOf(key),
          syncState.wc,
          {
            createIfNeeded: true,
            context: {
              edits: edits,
              shadowVersion: version,
              wcVersion: wc.serverVersion,
            },
          }
        );

        await tran.commit();
        return {
          wc: newWC,
          savedNew: true,
        };
      },
      hasEditsWithRetry ? EDIT_WITH_RETRY_TRAN_MS : undefined
    );

    if (!applyResult.savedNew) {
      return {
        edits: applyResult.edits || [],
        version: applyResult.wc.serverVersion,
      };
    }

    reqContext.debugLog(
      `Saved ${key}. RequestId: ${reqContext.id}, new version: ${applyResult.wc.serverVersion}`
    );

    //capture diff before update to save new shadow
    syncState.captureDiff();

    // Return edits to client
    return {
      edits: syncState.pendingEdits,
      version: applyResult.wc.serverVersion,
    };
  }

  private async applyEmptyEdits(
    reqContext: RequestContext,
    version: number | undefined,
    checksum: string | undefined
  ): Promise<ApplyEditsResponse> {
    if (version === undefined || version <= 0) {
      throw ServerErrors.badRequest(
        'apply empty edits failed because version must be greater than 0'
      );
    }
    if (checksum === undefined) {
      throw ServerErrors.badRequest(
        'apply empty edits failed because checksum is undefined'
      );
    }

    const recordDB = this._recordDB;

    //Can get WC outside the transaction
    const wcPath = pathUtils.wcOf(reqContext.key);
    let wc = await recordDB.getRecord(wcPath, false);
    if (wc) {
      wc = await this.gcIfNeeded(wcPath, wc, reqContext);
    }

    if (this.compareWCConsistency(version, checksum, wc)) {
      //WC has not changed
      return {
        edits: [],
      };
    }

    //WC has changed
    if (wc === undefined) {
      //If WC is not defined but client already has a version/checksum => inconsistent read issue
      throw ServerErrors.notFound('wc not found');
    }

    //Working Copy version must be newer so we will get the shadow version and send edits to upgrade to newest wc
    const accessPromise = this.checkAccess(
      reqContext.key,
      wc,
      reqContext,
      ServerAccessMode.GET
    );

    //Get Shadow by version
    const shadow = await recordDB.getRecord(
      pathUtils.versionOf(reqContext.key, version),
      false
    );

    if (shadow === undefined) {
      //Shadow should return. if not returned this is an inconsistent issue. need to try again.
      throw ServerErrors.conflict(`shadow version: ${version} not found`);
    }

    const syncState = new DiffSyncState(false);
    syncState.setState(wc, shadow);

    syncState.applyEdits([]);

    syncState.captureDiff();

    if (!(await accessPromise)) {
      throw accessDenied();
    }

    return {
      edits: syncState.pendingEdits,
      version: wc.serverVersion,
    };
  }

  //////LIST///////

  private async list(
    key: string,
    cursor: number | undefined,
    reqContext: RequestContext
  ): Promise<ListResponse> {
    const startTime = Date.now();
    const endTime = cursor || 0;

    reqContext.debugLog(
      `key: ${key} list starting. startTime: ${startTime}, endTime: ${endTime}`
    );
    const recordDB = this._recordDB;
    const result: ListResult[] = [];

    const latestRefs: { [key: string]: RefInfo } = {};
    await recordDB.scanDestRefs(key, ref => {
      if (ref.timestamp < endTime) {
        return true;
      }

      const curRef = latestRefs[ref.key];
      // New entry - definitely the latest one until now
      if (!curRef) {
        latestRefs[ref.key] = ref;
      } else if (ref.timestamp > curRef.timestamp) {
        // Found a newer entry. This shouldn't happen since entries are
        // sorted, but better safe than sorry.
        latestRefs[ref.key] = ref;
      }
    });

    const missingVersionsPromises: Promise<void>[] = [];
    // Finalize results for client
    for (const ref of Object.values(latestRefs).sort(compareRefInfo)) {
      const r: ListResult = {
        key: ref.key,
        //namespace: ref.namespace, Not needed for now
        hotFlag: Math.abs(ref.timestamp - startTime) <= HOT_KEY_INTERVAL_MS,
      };
      if (ref.version) {
        r.version = ref.version;
      } else {
        missingVersionsPromises.push(
          (async () => {
            const v = await recordDB.getRecordWCVersion(r.key, false);
            if (typeof v === 'number') {
              r.version = v;
            }
          })()
        );
      }
      result.push(r);
    }

    await Promise.allSettled(missingVersionsPromises);

    return {
      result: result,
      cursor: startTime - this._options.cursorClockOffset,
    };
  }

  //////GET/////////

  private async runGet(reqContext: RequestContext): Promise<RecordResponse> {
    const key = reqContext.key;
    const recordDB = this._recordDB;

    let listPromise: Promise<ListResponse> | undefined;
    let listResponse: ListResponse | undefined;

    if (reqContext.list) {
      listPromise = this.list(reqContext.key, reqContext.cursor, reqContext);
    }

    const wcPath = pathUtils.wcOf(key);
    let wc = await recordDB.getRecord(wcPath, false);

    const isSameWC = this.compareWCConsistency(
      reqContext.version,
      reqContext.checksum,
      wc
    );

    if (!isSameWC) {
      //WC has changed or not found
      if (wc === undefined) {
        throw ServerErrors.notFound();
      }

      await this.assertAccess(key, wc, reqContext, ServerAccessMode.GET);

      wc = await this.upgradeWorkingCopySchemeIfNeeded(wcPath, wc, reqContext);
      wc = await this.gcIfNeeded(wcPath, wc, reqContext);
    }

    if (listPromise) {
      listResponse = await listPromise;
    }

    return RecordResponse.get(
      key,
      reqContext.id,
      isSameWC ? undefined : wc,
      listResponse
    );
  }

  /**
   * check if the inconsistent read of the wc is the same as the request version/checksum
   * @param request
   * @param wc
   * @returns true: the wc is the same version of the request. can return an empty response
   */
  private compareWCConsistency(
    version: number | undefined,
    checksum: string | undefined,
    wc: Record | undefined
  ) {
    if (version !== undefined && checksum !== undefined) {
      if (wc === undefined) {
        //This can happen on the first version,
        //the inconsistent read returned no wc but the client already seen a record
        return true;
      }

      if (version > wc.serverVersion) {
        //This can happen when the inconsistent read returns an old version
        return true;
      }

      if (version === wc.serverVersion) {
        if (wc.checksum === checksum) {
          //Same version + checksum.
          return !wc.scheme.upgradeAvailable();
        } else {
          //Same version number but the checksum is different.
          //This can be caused by a bug of checksum calculation
          throw ServerErrors.badRequest(
            `found inconsistent checksum in version: ${version}, client checksum: ${checksum}, server checksum: ${wc.checksum}`
          );
        }
      }
    }

    //version + checksum have not been sent or request.version < wc.version
    return false;
  }

  private async upgradeWorkingCopySchemeIfNeeded(
    wcPath: RecordPath,
    wc: Record,
    reqContext: RequestContext
  ): Promise<Record> {
    if (wc.scheme.upgradeAvailable()) {
      const recordDB = this._recordDB;
      const newWC = await recordDB.txn(reqContext.serverContext, async tran => {
        const tranRec = await tran.getRecordSafe(wcPath);

        if (tranRec.upgradeSchemeToLatest()) {
          return await tran.updateRecord(wcPath, tranRec, {
            createIfNeeded: false,
            context: {
              desc: 'version-upgrade',
            },
          });
        }

        return tranRec;
      });
      wc = newWC;
    }
    return wc;
  }

  private async gcIfNeeded(
    wcPath: RecordPath,
    wc: Record,
    reqContext: RequestContext
  ): Promise<Record> {
    if (wc.needGC()) {
      const recordDB = this._recordDB;
      const newWC = await recordDB.txn(reqContext.serverContext, async tran => {
        const tranRec = await tran.getRecordSafe(wcPath);

        if (tranRec.gc()) {
          return await tran.updateRecord(wcPath, tranRec, {
            createIfNeeded: false,
            context: {
              desc: 'gc',
            },
          });
        }

        return tranRec;
      });
      reqContext.debugLog(
        `GC for wc: ${wcPath.key}, version: ${wc.serverVersion}`,
        {
          type: 'gc',
        }
      );
      wc = newWC;
    }
    return wc;
  }
  /////GENERAL/////////
  private async assertAccess(
    key: string,
    wc: Record | undefined,
    reqContext: RequestContext,
    mode: ServerAccessMode,
    throwOnError = true
  ): Promise<boolean> {
    let error: ServerError | undefined;
    const isAuth = await this.checkAccess(key, wc, reqContext, mode);

    if (!isAuth) {
      error = accessDenied();
    }

    if (error) {
      if (!throwOnError) return false;
      throw error;
    }

    return true;
  }

  private async checkAccess(
    key: string,
    wc: Record | undefined,
    reqContext: RequestContext,
    mode: ServerAccessMode
  ): Promise<boolean> {
    if (!wc) return true;

    try {
      return await this._authValidator(
        this._recordDB,
        key,
        wc,
        reqContext.serverContext,
        mode
      );
    } catch (e: any) {
      reqContext.warnLog('Auth validator thrown an exception. - ' + e.message);
      return false;
    }
  }

  private handleError(err: any, context: RequestContext) {
    const serverError =
      err instanceof ServerError
        ? err
        : unknownCommand(err, ServerErrors.Code.InternalServerError);

    if (serverError.code !== ServerErrors.Code.BadRequest) {
      context.warnLog(
        `Request ${context.cmd}:${context.key}: ${context.id} failed: ${serverError.code}`,
        {
          type: 'request_failed',
          code: serverError.code,
        },
        serverError
      );
    } else {
      const info = serverError.internalInfo;
      delete serverError.internalInfo;

      context.errorLog(
        `Request ${context.cmd}:${context.key}: ${context.id} failed: ${serverError.code}`,
        err,
        {
          type: 'request_failed',
          code: serverError.code,
        }
      );

      this._errorDB.report({
        error: serverError,
        info,
        message: 'Server Bad Request error',
        recordKey: context.key,
        sessionId: context.sessionId,
        userId: context.userId,
        recordVersion: context.version,
      });
    }

    return RecordResponse.error(context.key, context.id, serverError);
  }
}
