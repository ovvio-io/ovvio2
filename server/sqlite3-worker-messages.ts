import { EncodedOwnedSession } from '../auth/session.ts';
import { JSONObject, JSONArray } from '../base/interfaces.ts';
import { RepositoryType } from '../repo/repo.ts';

export interface CommitsMessage extends JSONObject {
  msg: 'commits';
  repoId: string;
  commits: JSONArray; // Array of commit objects encoded as JSON
}

export interface OpenRepositoryMessage extends JSONObject {
  msg: 'openRepo';
  type: RepositoryType;
  id: string;
  path: string;
  session: EncodedOwnedSession;
  replicas: string[];
  requestId: number;
}

export interface LoadingFinishedMessage extends JSONObject {
  msg: 'loadingFinished';
  type: RepositoryType;
  id: string;
  count: number;
  requestId: number;
}

export type SQLite3WorkerMessage =
  | CommitsMessage
  | OpenRepositoryMessage
  | LoadingFinishedMessage;
