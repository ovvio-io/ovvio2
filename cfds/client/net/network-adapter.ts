import EventEmitter from 'eventemitter3';
import { RecordRequest, RecordResponse } from '../../server/types';

const RESPONSE_EVENT = 'NA_RESPONSE';
const ERROR_EVENT = 'NA_ERROR';
const ONLINE_EVENT = 'NA_ONLINE';

export abstract class NetworkAdapter extends EventEmitter {
  private _isOnline: boolean;
  private _lastOnline: Date | undefined;

  constructor() {
    super();
    this._isOnline = false;
  }

  get lastOnline() {
    return this._lastOnline;
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  abstract get ready(): boolean;
  public abstract send(requests: RecordRequest[]): any[] | undefined;
  public abstract close(): void;
  public abstract connect(): void;

  addResponseHandler(f: (resp: RecordResponse[]) => void) {
    this.addListener(RESPONSE_EVENT, f);
  }

  removeResponseHandler(f: (resp: RecordResponse[]) => void) {
    this.removeListener(RESPONSE_EVENT, f);
  }

  addErrorHandler(f: (errorCode: number, ticket: any) => void) {
    this.addListener(ERROR_EVENT, f);
  }

  removeErrorHandler(f: (errorCode: number, ticket: any) => void) {
    this.removeListener(ERROR_EVENT, f);
  }

  addOnlineHandler(f: (isOnline: boolean) => void) {
    this.addListener(ONLINE_EVENT, f);
  }

  removeOnlineHandler(f: (isOnline: boolean) => void) {
    this.removeListener(ONLINE_EVENT, f);
  }

  abstract getLatencies(): number[];
  abstract clearLatencies(): void;

  protected onResponse(resp: RecordResponse[]) {
    this.emit(RESPONSE_EVENT, resp);
  }

  protected onError(errorCode: number, ticket: any) {
    this.emit(ERROR_EVENT, errorCode, ticket);
  }

  protected onOnlineChanged(isOnline: boolean) {
    if (this._isOnline === isOnline) return;
    if ((isOnline && !this._lastOnline) || (!isOnline && this._isOnline)) {
      //Save last online when switching from true to false
      this._lastOnline = new Date();
    }
    this._isOnline = isOnline;
    this.emit(ONLINE_EVENT, isOnline);
  }
}
