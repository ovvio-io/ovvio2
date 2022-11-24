import config from 'core/config';
import { CurrentUser } from 'stores/user';

const MAX_ATTEMPTS = 5;
const RETRY_DELAY = 100;

export interface CallOptions {
  headers?: { [key: string]: any };
  body?: any;
  signal?: any;
}

export class RestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly respBody: any,
    readonly resp: any
  ) {
    super(message);
  }
}

export class RestClient {
  private _user: CurrentUser;
  constructor(currentUser: CurrentUser) {
    this._user = currentUser;
  }

  get user() {
    return this._user;
  }

  async get<T>(url: string, opts: CallOptions = {}) {
    return await this.call<T>('get', url, opts);
  }

  async post<T>(url: string, body: any, opts: CallOptions = {}) {
    return await this.call<T>('post', url, {
      body,
      ...opts,
    });
  }

  async put<T>(url: string, body: any, opts: CallOptions = {}) {
    return await this.call<T>('put', url, {
      body,
      ...opts,
    });
  }

  async delete<T>(url: string, opts: CallOptions = {}) {
    return await this.call<T>('delete', url, opts);
  }

  async call<T>(method: string, url: string, opts: CallOptions): Promise<T> {
    return this._call(method, url, opts, 1, false);
  }

  private async _call<T>(
    method: string,
    url: string,
    callOptions: CallOptions,
    attempt: number,
    forceTokenRefresh: boolean
  ): Promise<T> {
    const { headers, body, signal } = callOptions;

    let defaultHeaders = {};
    if (this.user) {
      const token = await this.user.getToken(forceTokenRefresh);
      defaultHeaders = {
        Authorization: `Bearer ${token}`,
        'Session-Id': this.user.sessionId,
      };
    }

    if (body) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    let sendUrl = url;

    if (!sendUrl.startsWith('/')) {
      sendUrl = `/${sendUrl}`;
    }
    sendUrl = `${config.apiUrl}${sendUrl}`;

    const opts: any = {
      method,
      signal,
      headers: {
        ...defaultHeaders,
        ...(headers || {}),
      },
    };
    if (body) {
      opts.body = body;
      if (opts.headers['Content-Type'] === 'application/json') {
        opts.body = JSON.stringify(opts.body);
      }
    }
    let resp: Response;
    try {
      resp = await fetch(sendUrl, opts);
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY);
        return await this._call(method, url, callOptions, attempt + 1, false);
      }

      throw error;
    }
    const contentType = resp.headers.get('Content-Type');

    let respBody: any;

    if (contentType.includes('application/json')) {
      respBody = await resp.json();
    }

    if (resp.ok) {
      return respBody;
    }

    if (attempt < MAX_ATTEMPTS) {
      const [needRetry, forceTokenRefresh] = this._needRetry(resp);

      if (needRetry) {
        await sleep(RETRY_DELAY);
        return await this._call(
          method,
          url,
          callOptions,
          attempt + 1,
          forceTokenRefresh
        );
      }
    }

    const err = new RestError(
      `Rest call: ${method} - ${sendUrl} failed: Status: ${
        resp.status
      }. Body: ${JSON.stringify(respBody)}`,
      resp.status,
      respBody,
      resp
    );
    throw err;
  }

  private _needRetry(resp: Response) {
    if (resp.status === 401) {
      return [true, true];
    }

    return [false, false];
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default RestClient;
