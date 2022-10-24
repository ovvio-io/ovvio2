import { Observable, createProvider, useScopedObservable } from 'core/state';

import { RestClient } from 'api';
import { LOGIN } from 'core/react-utils/history';
import { User, getAuth } from 'firebase/auth';

export enum SessionOrigin {
  SIGN_UP,
  SIGN_IN,
  ALREADY_SIGNED_IN,
}

interface SaveResult {
  created: boolean;
  invites: number;
  firstCardKey?: string;
}

class CurrentUser extends Observable {
  private _firebaseUser: User;
  private _origin: SessionOrigin;
  private _hasSignedOut: boolean;
  private _signingOutStarted: boolean;
  private _sessionId: string;

  constructor(firebaseUser: User, origin: SessionOrigin, sessionId: string) {
    super();
    this._firebaseUser = firebaseUser;
    this._origin = origin;
    this._hasSignedOut = false;
    this._signingOutStarted = false;
    this._sessionId = sessionId;
  }

  get sessionId() {
    return this._sessionId;
  }

  get name() {
    return this._firebaseUser.displayName;
  }

  get hasSignedOut() {
    return this._hasSignedOut;
  }

  set hasSignedOut(v: boolean) {
    this._hasSignedOut = v;
  }

  get signingOutStarted() {
    return this._signingOutStarted;
  }

  set signingOutStarted(v: boolean) {
    this._signingOutStarted = v;
  }

  get origin() {
    return this._origin;
  }

  get firstLogin() {
    return this._origin === SessionOrigin.SIGN_UP;
  }

  get initials() {
    const firstName = (this.name || '').split(' ').filter(x => x)[0];

    return firstName ? firstName[0].toUpperCase() : '';
  }

  get avatarUrl() {
    return this._firebaseUser.photoURL;
  }

  get id() {
    return this._firebaseUser.uid;
  }

  get email() {
    return this._firebaseUser.email;
  }

  async getToken(forceRefresh = false) {
    return await this._firebaseUser.getIdToken(forceRefresh);
  }
}

class UserStore extends Observable {
  private _currentUser: CurrentUser;
  private _saveResult?: SaveResult;

  constructor(currentUser: CurrentUser) {
    super();
    this._currentUser = currentUser;
  }

  get currentUser() {
    return this._currentUser;
  }

  get sessionId() {
    return this._currentUser.sessionId;
  }

  get uninvitedSignUp() {
    if (this._saveResult) {
      return this._saveResult.created && this._saveResult.invites === 0;
    }
    return false;
  }

  get firstCardKey(): string | undefined {
    return this._saveResult?.firstCardKey;
  }

  get user() {
    return this._currentUser;
  }

  get name() {
    return this._currentUser.name;
  }

  get initials() {
    return (this.name || '')
      .split(' ')
      .filter(x => x)
      .map(x => x[0].toUpperCase())
      .join('');
  }

  get avatarUrl() {
    return this._currentUser.avatarUrl;
  }

  get id() {
    return this._currentUser.id;
  }

  get email() {
    return this._currentUser.email;
  }

  async getToken() {
    return await this._currentUser.getToken();
  }

  async save() {
    const client = new RestClient(this._currentUser);

    this._saveResult = await client.post<SaveResult>('/users', {
      name: this.name,
      email: this.email,
      avatarUrl: this.avatarUrl,
    });
  }

  async logout(history) {
    this._currentUser.signingOutStarted = true;
    await getAuth().signOut();
    this._currentUser.hasSignedOut = true;
    if (history && history.push) {
      history.push(LOGIN);
    }
  }

  async getElectronSSOToken() {
    const client = new RestClient(this._currentUser);

    const res = await client.post<ElectronSSOTokenResponse>(
      '/electron-sso',
      {}
    );
    return res.token;
  }
}

interface ElectronSSOTokenResponse {
  token: string;
}

const UserProvider = createProvider(UserStore);

function useCurrentUser(): CurrentUser {
  return useScopedObservable(CurrentUser);
}

export default UserStore;

export { UserProvider, UserStore, CurrentUser, useCurrentUser };
