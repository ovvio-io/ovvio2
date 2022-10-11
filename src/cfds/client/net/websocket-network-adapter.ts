import { Utils, Logger } from '@ovvio/base';
import { RecordRequest } from '../../server/types';
import { NetworkAdapter } from './network-adapter';
import WebSocketWrapper, { SOCKET_NORMAL_CLOSE } from './websocket-wrapper';

const MAX_BATCH_SIZE = 20;

const CHECK_CONNECTION_INTERVAL = 500;
const KEEP_ALIVE_THRESHOLD_TIME = 5000; //5 seconds
const WS_GRACE_PERIOD = 1000 * 30; //30 seconds
const FORCE_RECONNECTION_AFTER = 5 * 60 * 1000; //5 minutes

export class WSNetworkAdapter extends NetworkAdapter {
  private _baseUrl: string;
  private _tokenGenerator: () => string | Promise<string>;
  private _activeSockets: WebSocketWrapper[];
  private _protocol: string;
  private _socketCount: number;
  private _maxBatchSize: number;
  private _isClosed: boolean;
  private _checkConnectionInterval?: NodeJS.Timeout;
  private _lastForceReconnection: number;
  private _isForcingReconnection: boolean;
  private _latencies: number[];
  private _firstCreation: boolean = true;

  constructor(
    baseUrl: string,
    clientId: string,
    socketCount: number,
    tokenGenerator: () => string | Promise<string> = () => '',
    maxBatchSize: number = MAX_BATCH_SIZE,
    autoConnect = true
  ) {
    super();

    const urlSplit = baseUrl.split('://');
    this._protocol = urlSplit[0];
    this._baseUrl = urlSplit[1];
    if (!this._baseUrl.endsWith('/')) this._baseUrl += '/';
    this._baseUrl += clientId;

    this._tokenGenerator = tokenGenerator;
    this._activeSockets = [];
    this._socketCount = socketCount;
    this._maxBatchSize = maxBatchSize;
    this._isClosed = true;
    this._lastForceReconnection = Date.now();
    this._isForcingReconnection = false;
    this._latencies = [];

    if (autoConnect) {
      this.connect();
    }
  }

  public close(): void {
    if (this._isClosed) return;

    this._isClosed = true;

    if (this._checkConnectionInterval) {
      clearInterval(this._checkConnectionInterval);
    }

    for (const socket of this._activeSockets) {
      socket.close(SOCKET_NORMAL_CLOSE, 'network adapter closed');
    }

    this._activeSockets = [];

    Logger.debug('Network adapter closed');
  }

  getLatencies() {
    return this._latencies;
  }

  clearLatencies() {
    this._latencies = [];
  }

  async connect() {
    if (!this._isClosed) {
      return;
    }

    this._isClosed = false;
    this._lastForceReconnection = Date.now();
    this._isForcingReconnection = false;
    Logger.debug('Network adapter connecting...');

    this._getToken().then(token => {
      for (let i = 0; i < this._socketCount; ++i) {
        this._activeSockets.push(
          this._createSocket(token, this._firstCreation)
        );
      }
      this._firstCreation = false;

      this._checkConnectionInterval = setInterval(() => {
        this._checkConnection().catch(err => {
          Logger.warn('web-socket checkConnection error', undefined, err);
        });
      }, CHECK_CONNECTION_INTERVAL);
    });
  }

  private async _checkConnection() {
    if (this._isClosed) return;

    const activeSockets = this._activeSockets;
    let conCount = 0;
    let token: string | undefined;

    for (let i = 0; i < activeSockets.length; i++) {
      const socket = activeSockets[i];
      if (socket.checkConnection()) {
        conCount++;
      } else {
        //Send closeCode
        if (socket.closeCode) {
          this.onError(socket.closeCode, socket);

          if (this._isClosed) {
            return;
          }
        }

        //Reconnect
        Logger.info(
          `socket connection has been closed with code: ${socket.closeCode}. will attempt to reconnect`
        );

        if (token === undefined) {
          token = await this._getToken();
        }

        socket.close();
        activeSockets[i] = this._createSocket(token, false);
      }
    }

    this.onOnlineChanged(conCount > 0);

    if (Date.now() - this._lastForceReconnection >= FORCE_RECONNECTION_AFTER) {
      this._lastForceReconnection = Date.now();
      if (token === undefined) {
        token = await this._getToken();
      }
      this._forceNewConnections(token);
    }
  }

  private _forceNewConnections(token: string | undefined) {
    if (this._isClosed || this._isForcingReconnection) return;

    this._isForcingReconnection = true;
    Logger.debug('force new ws connection starting...');

    const activeSockets = this._activeSockets;
    try {
      for (let i = 0; i < activeSockets.length; i++) {
        const socket = activeSockets[i];

        try {
          socket.close();
        } catch {}

        Logger.debug('forcibly closed socket and recreating it...');

        activeSockets[i] = this._createSocket(token, false);
      }
    } finally {
      this._isForcingReconnection = false;
    }
  }

  get ready() {
    for (const socket of this._activeSockets) {
      if (socket.isReady) {
        return true;
      }
    }
    return false;
  }

  send(requests: RecordRequest[]): any[] | undefined {
    Utils.assert(requests.length > 0);
    const readySockets = this._activeSockets.filter(s => s.isReady);
    const readyCount = readySockets.length;
    // No sockets are available. Discard sending and let the requests time out
    // at the caller
    if (!readyCount) {
      return undefined;
    }

    // const batchLength = requests.length;
    // // Compute a reasonable packet size
    // const packetSize = Math.min(
    //   this._maxBatchSize,
    //   Math.max(1, Math.ceil(batchLength / readyCount))
    // );
    // For load balancing purposes we shuffle our sockets before sending.
    // TODO: Take into account the bufferedAmount of each socket
    Utils.Array.shuffle(readySockets);
    let rIndex = 0;
    // Split our batch to smaller packets, and send one over each ready socket
    let sIndex = 0;
    const tickets = new Array<any>(requests.length);
    const maxBatchSize = this._maxBatchSize;
    while (rIndex < requests.length) {
      const packet = requests.slice(rIndex, rIndex + maxBatchSize);
      const socket = readySockets[sIndex];
      tickets.fill(socket, rIndex, rIndex + maxBatchSize);

      socket.send(packet);
      rIndex += packet.length;
      sIndex = (sIndex + 1) % readySockets.length;
    }
    return tickets;
  }

  private async _getToken() {
    try {
      return await this._tokenGenerator();
    } catch (err: any) {
      Logger.warn('token generator error', undefined, err);
    }
  }

  private _createSocket(token: string | undefined, firstCreation: boolean) {
    const wrapper = new WebSocketWrapper(
      this._protocol,
      this._baseUrl,
      KEEP_ALIVE_THRESHOLD_TIME,
      firstCreation ? WS_GRACE_PERIOD : 0
    );

    wrapper.onMessageReceived(resp => this.onResponse(resp));

    wrapper.onPingPong(latency => {
      this._latencies.push(latency);
    });

    if (token !== undefined) wrapper.connect(token);

    return wrapper;
  }
}
