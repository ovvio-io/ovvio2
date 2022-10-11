import { Edit } from '../../base/ds-state';
import { ServerError, serviceUnavailable, timeout } from '../../server/errors';
import {
  ListResponse,
  RecordRequest,
  RecordResponse,
  RequestCommand,
} from '../../server/types';
import { Record } from '../../base/record';
import { NetworkAdapter } from '../net/network-adapter';
import { Dictionary } from '../../collections/dict';
import { SimpleTimer } from '../timer';
import { assert, EnvVars } from '@ovvio/base/lib/utils';
import { MovingAverage } from '@ovvio/base/lib/utils/math';
import {
  CoroutineScheduler,
  CoroutineTimer,
  SchedulerPriority,
} from '../coroutine';

const REQ_START_TIMEOUT_MS = 30000;
const START_TIME = 2 * 60 * 1000; //2 minutes
const REQ_NORMAL_TIMEOUT_MS = EnvVars.getInt('CFDS_SOCKET_TIMEOUT', 5000)!;
const BATCH_REQ_DELAY_MS = 100;
const MAX_BATCH_SIZE = 50;

export interface Request {
  cmd: RequestCommand;
  edits?: Edit[];
  cursor?: number;
  list: boolean;
  version?: number;
  checksum?: string;
}

export interface Response {
  readonly key: string;
  readonly error?: ServerError;
  readonly state?: {
    wc: Record;
  };
  readonly edits?: Edit[];
  readonly list?: ListResponse;
  readonly serverTimestamp?: Date;
  readonly serverVersion?: number;
}

interface PromiseHandlers {
  resolve: (value: Response | PromiseLike<Response>) => void;
  reject: (reason?: any) => void;
}

interface Message {
  readonly request: RecordRequest;
  readonly handler: PromiseHandlers;
  readonly timeoutTimer: SimpleTimer;
  ticket?: any;
  sendTime?: number;
}

function buildMessageKey(recordKey: string, msgId: number): string {
  return recordKey + '/' + String(msgId);
}

function __nop(): void {}

export class Socket {
  readonly networkAdapter: NetworkAdapter;
  private readonly requestIds: Dictionary<string, number>;
  private readonly pendingMessages: Dictionary<string, Message>;
  private readonly nextReqBatchTimer: SimpleTimer;
  private readonly nextRespBatchTimer: CoroutineTimer;
  private readonly pendingResponses: RecordResponse[];
  private readonly avgMsgTime: MovingAverage;
  private inFlightMessages: Dictionary<string, Message>;

  private _firstRequestTime?: number;

  constructor(adapter: NetworkAdapter) {
    this.networkAdapter = adapter;
    adapter.addResponseHandler(resp => this.onResponse(resp));
    adapter.addErrorHandler((err, ticket) => this.onError(err, ticket));
    this.requestIds = new Map();
    this.pendingMessages = new Map();
    this.inFlightMessages = new Map();
    this.nextReqBatchTimer = new SimpleTimer(
      BATCH_REQ_DELAY_MS,
      false,
      () => this.sendPendingRequests(),
      'Socket: Next req batch'
    );
    this.nextRespBatchTimer = new CoroutineTimer(
      CoroutineScheduler.sharedScheduler(),
      () => this.processPendingResponses(),
      SchedulerPriority.Normal,
      'Socket: Next resp batch'
    );
    this.pendingResponses = [];
    this.avgMsgTime = new MovingAverage(10);
  }

  get isOnline(): boolean {
    return this.networkAdapter.isOnline;
  }

  send(key: string, req: Request): Promise<Response> {
    const requestId = this.requestIds.get(key) || 1;
    this.requestIds.set(key, requestId + 1);
    const msgKey = buildMessageKey(key, requestId);
    const recordReq = new RecordRequest(
      key,
      requestId,
      req.cmd,
      req.edits,
      req.cursor,
      req.list,
      req.version,
      req.checksum
    );
    const handler: PromiseHandlers = {
      resolve: __nop,
      reject: __nop,
    };
    const timeoutTimer = new SimpleTimer(
      this.getRequestTimeout(),
      false,
      () => {
        this.onRequestTimeout(msgKey);
      },
      `Socket: Timeout for ${msgKey}`
    );

    this.pendingMessages.set(msgKey, {
      request: recordReq,
      handler,
      timeoutTimer,
    });
    this.nextReqBatchTimer.schedule();
    // timeoutTimer.schedule();
    return new Promise<Response>((resolve, reject) => {
      handler.resolve = resolve;
      handler.reject = reject;
    });
  }

  private sendPendingRequests(): void {
    const pendingMessages = this.pendingMessages;
    if (pendingMessages.size <= 0) {
      return;
    }
    if (!this.networkAdapter.isOnline) {
      this.nextReqBatchTimer.schedule();
      return;
    }
    const batch: RecordRequest[] = [];
    for (const msg of this.pendingMessages.values()) {
      batch.push(msg.request);
      if (batch.length === MAX_BATCH_SIZE) {
        this.nextReqBatchTimer.schedule();
        break;
      }
    }
    // debugger;
    const tickets = this.networkAdapter.send(batch);

    //Logger.info('Sent request base size: ' + batch.length);
    const sendTime = Date.now();
    if (tickets !== undefined) {
      const inFlightMessages = this.inFlightMessages;
      assert(tickets.length === batch.length);
      for (let i = 0; i < tickets.length; ++i) {
        const msgKey = buildMessageKey(batch[i].key, batch[i].id);
        const msg = pendingMessages.get(msgKey)!;
        inFlightMessages.set(msgKey, msg);
        pendingMessages.delete(msgKey);
        msg.ticket = tickets[i];
        msg.sendTime = sendTime;
        msg.timeoutTimer.schedule();
      }
      // pendingMessages.clear();
    } else {
      const nextBatchTimer = this.nextReqBatchTimer;
      nextBatchTimer.schedule();
    }
  }

  private onResponse(respArr: RecordResponse[]): void {
    const pendingResponses = this.pendingResponses;
    const now = Date.now();
    const avgMsgTime = this.avgMsgTime;
    for (const resp of respArr) {
      pendingResponses.push(resp);
      const msgKey = buildMessageKey(resp.key, resp.id);
      const msg = this.inFlightMessages.get(msgKey);
      if (msg?.sendTime !== undefined) {
        avgMsgTime.addValue(now - msg?.sendTime);
      }
    }
    this.nextRespBatchTimer.schedule();
  }

  private processPendingResponses(): boolean {
    const inFlightMessages = this.inFlightMessages;
    const pendingResponses = this.pendingResponses;
    if (pendingResponses.length > 0) {
      const resp = pendingResponses.shift()!;
      if (this.requestIds.get(resp.key) !== resp.id + 1) {
        return this.pendingResponses.length > 0;
      }

      const msgKey = buildMessageKey(resp.key, resp.id);
      const msg = inFlightMessages.get(msgKey);
      if (msg === undefined) {
        return this.pendingResponses.length > 0;
      }

      msg.timeoutTimer.unschedule();
      inFlightMessages.delete(msgKey);
      msg.handler.resolve(resp);
    }
    return this.pendingResponses.length > 0;
    //Logger.info('Avg message time: ' + this.avgMsgTime.currentValue / 1000);
    // this.pendingResponses = [];
    // for (const resp of pendingResponses) {
    //   const msgKey = buildMessageKey(resp.key, resp.id);
    //   const msg = inFlightMessages.get(msgKey);
    //   if (msg === undefined) {
    //     continue;
    //   }
    //   msg.timeoutTimer.unschedule();
    //   inFlightMessages.delete(msgKey);
    //   msg.handler.resolve(resp);
    // }
  }

  private onError(code: number, ticket: any): void {
    const err = serviceUnavailable();
    const inFlightMessages = this.inFlightMessages;
    const failedKeys = new Set<string>();
    for (const [key, msg] of inFlightMessages) {
      if (msg.ticket === ticket) {
        failedKeys.add(key);
      }
    }
    for (const key of failedKeys) {
      const msg = inFlightMessages.get(key)!;
      msg.timeoutTimer.unschedule();
      inFlightMessages.delete(key);
      msg.handler.reject(err);
    }
  }

  private onRequestTimeout(msgKey: string): void {
    const msg =
      this.inFlightMessages.get(msgKey) || this.pendingMessages.get(msgKey)!;
    assert(msg !== undefined);
    this.inFlightMessages.delete(msgKey);
    this.pendingMessages.delete(msgKey);
    msg.handler.reject(timeout());
  }

  private getRequestTimeout() {
    if (this._firstRequestTime === undefined) {
      this._firstRequestTime = Date.now();
    }
    if (Date.now() - this._firstRequestTime <= START_TIME) {
      return REQ_START_TIMEOUT_MS;
    }
    return REQ_NORMAL_TIMEOUT_MS;
  }
}
