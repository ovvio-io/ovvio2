import { Logger } from '@ovvio/base';
import WebSocket from 'isomorphic-ws';
import Pako from 'pako';
import { CFDS_VERSION } from '../../base/defs';
import { timeout } from '../../server/errors';
import { RecordRequest, RecordResponse } from '../../server/types';

export const SOCKET_NORMAL_CLOSE = 4000;
export const SOCKET_KEEP_ALIVE_CLOSE = 4001;
export const SOCKET_TOKEN_GEN_ERROR = 4002;
export const CONNECTION_KEEP_ALIVE_DELAY = 500;

export default class WebSocketWrapper {
  private _protocol: string;
  private _baseUrl: string;
  private _keepAliveThreshold: number;
  private _gracePeriod: number;
  private _createdTime: number;

  private _onMessage?: (responses: RecordResponse[]) => void;
  private _onPingPong?: (latency: number) => void;

  private _socket: WebSocket | undefined;

  private _sentRequests: Set<string>;
  private _closeCode?: number;
  private _lastReceiveTime: number;
  private _lastSendTime?: number;

  constructor(
    protocol: string,
    baseUrl: string,
    keepAliveThreshold: number,
    gracePeriod?: number
  ) {
    this._protocol = protocol;
    this._baseUrl = baseUrl;
    this._keepAliveThreshold = keepAliveThreshold;

    this._sentRequests = new Set<string>();
    this._gracePeriod = gracePeriod || 0;

    Logger.debug(
      `Socket wrapper created. keepAliveThreshold: ${keepAliveThreshold}, gracePeriod: ${this._gracePeriod}`
    );

    this._lastReceiveTime = 0;
    this._createdTime = Date.now();
  }

  get closeCode() {
    return this._closeCode;
  }

  get isReady() {
    if (this._socket) {
      return this._socket.readyState === this._socket.OPEN;
    }
    return false;
  }

  onMessageReceived(fn: (responses: RecordResponse[]) => void) {
    this._onMessage = fn;
  }

  onPingPong(fn: (latency: number) => void) {
    this._onPingPong = fn;
  }

  send(requests: RecordRequest[]) {
    if (this._socket) {
      const message = [];
      for (const req of requests) {
        const reqJS = req.toJS();
        message.push(reqJS);
        this._sentRequests.add(`${req.key}_${req.id}`);
      }

      this._socket.send(Pako.deflate(JSON.stringify(message)));
      this._lastSendTime = Date.now();
    }
  }

  checkConnection(): boolean {
    if (this._socket === undefined) {
      return false;
    }

    if (this._socket.readyState === this._socket.CLOSED) {
      this.cleanup();
      return false;
    }

    const now = Date.now();
    if (this._createdTime + this._gracePeriod <= now) {
      //Check if reach threshold
      if (
        this._lastSendTime &&
        this._lastSendTime - this._lastReceiveTime >= this._keepAliveThreshold
      ) {
        Logger.warn(
          `closing web-socket because it reach keep-alive unhealthy threshold of ${this._keepAliveThreshold} milliseconds without a response`
        );
        this.close(SOCKET_KEEP_ALIVE_CLOSE, 'closed because of keep alive');
        return false;
      }

      if (this.isReady) {
        this._socket.send('p-' + now);
      }
      this._lastSendTime = now;
    }

    return true;
  }

  close(code?: number, reason?: string) {
    if (this._socket) {
      code = code || SOCKET_NORMAL_CLOSE;
      try {
        this._socket.close(code, reason);
      } catch (err) {
        Logger.warn('socket close error.', err);
      } finally {
        this._closeCode = code;
      }
    }
    this.cleanup();
  }

  private cleanup() {
    if (this._socket === undefined) return;

    this._socket.onclose = () => {};
    this._socket.onerror = () => {};

    //Send timeouts
    if (this._sentRequests.size > 0 && this._onMessage) {
      const timeouts: RecordResponse[] = [];

      for (const req of this._sentRequests) {
        const [key, id] = req.split('_');
        timeouts.push(RecordResponse.error(key, parseInt(id), timeout()));
      }

      this._onMessage(timeouts);
    }

    this._socket = undefined;
    this._sentRequests.clear();
  }

  connect(token: string) {
    if (this._socket !== undefined) return;

    this._closeCode = undefined;
    this._lastReceiveTime = Date.now() + CONNECTION_KEEP_ALIVE_DELAY;
    this._lastSendTime = undefined;

    const url = `${this._protocol}://${this._baseUrl}?token=${token}&cfds_v=${CFDS_VERSION}`;

    const socket = new WebSocket(url, [this._protocol]);
    Logger.info('Socket connecting...');

    socket.onopen = () => {
      Logger.info('Socket connected');
    };

    socket.onerror = event => {
      Logger.warn('socket error. ', event.error);
    };
    socket.onclose = event => {
      if (event.code >= SOCKET_NORMAL_CLOSE) {
        Logger.debug(
          `received socket closed event: code: ${event.code}, reason: ${event.reason}`
        );
      } else {
        Logger.warn(
          `received socket closed event: code: ${event.code}, reason: ${event.reason}`
        );
      }
      this._closeCode = event.code;
    };

    socket.onmessage = async event => {
      this._lastReceiveTime = Date.now();

      try {
        if (typeof event.data === 'string') {
          if (event.data.startsWith('p')) {
            const pongSplit = event.data.split('-');
            if (pongSplit.length === 2) {
              const pingTs = parseInt(pongSplit[1]);
              if (pingTs > 0) {
                if (this._onPingPong) this._onPingPong(Date.now() - pingTs);
              }
            }
            //ignore
            return;
          }
        }

        const data: any = event.data;
        let buffer: any;
        if (typeof data.arrayBuffer === 'function') {
          buffer = await data.arrayBuffer();
        } else {
          buffer = await new Response(data).arrayBuffer();
        }

        const message = JSON.parse(Pako.inflate(buffer, { to: 'string' }));
        const responses: RecordResponse[] = message.map((m: any) =>
          RecordResponse.fromJS(m)
        );

        for (const resp of responses) {
          this._sentRequests.delete(`${resp.key}_${resp.id}`);
        }

        if (this._onMessage) this._onMessage(responses);
      } catch (e) {
        debugger;
        Logger.error('Error handling server response', e);
      }
    };

    this._socket = socket;
  }
}
