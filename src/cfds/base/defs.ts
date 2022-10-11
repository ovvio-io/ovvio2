import { DiffMatchPatch, DiffOperation } from 'diff-match-patch-typescript';

export const kDMP = new DiffMatchPatch();
// WARNING: Timeout value must be aligned with
// @ovvio/cfds/server/server.js/UPDATE_TIMEOUT_MS or clients may be locked
// out after a disconnect, unable to send pending edits.
//
// TODO(dor): Configure with env
kDMP.diffTimeout = 0.5;

const pkg = require('../../package.json');

export const CFDS_VERSION: string = pkg.version;
export const CFDS_COMP_MIN_VERSION: string =
  pkg.compatibilityMinVersion || pkg.version;
export const CFDS_COMP_MAX_VERSION: string =
  pkg.compatibilityMaxVersion || pkg.version;

export enum DiffOp {
  Delete = DiffOperation.DIFF_DELETE,
  Insert = DiffOperation.DIFF_INSERT,
  Equal = DiffOperation.DIFF_EQUAL,
}

export enum ChangeType {
  Insert = 1,
  Other = 2,
  Equal = 0,
  Delete = -1,
  DeleteRange = -2,
}

export enum Dir {
  After = 1,
  Before = -1,
  Exact = 0,
}
