import Utils from '@ovvio/base/lib/utils';
import { StreamMD5 } from '../external/md5';

// When set to true, ChecksumStream will keep a _json property with the
// entire JSON for debugging purposes.
const DEBUG_JSON = false;

const STATE_ARR = 'a';
const STATE_OBJ = 'o';
const STATE_KEY = 'k';

/**
 * A base class for computing rolling checksums on in-memory structures that
 * are not strings. Since almost all structures can serialize to something
 * similar to JSON, this class exposes serialization-like methods.
 */
export class ChecksumStream {
  constructor() {
    this.reset();
  }

  reset() {
    this._stateStack = [];
    if (DEBUG_JSON) {
      this._json = '';
    }
  }

  /**
   * Hook for subclasses. Called with a string representing a shard of a JSON
   * document. Examples include: "{", "some_key:", "123", etc.
   */
  onShardAdded(str) {}

  /**
   * Override this method in your subclass to return the actual result value.
   */
  getValue() {
    Utils.assert(this._stateStack.length === 0);
  }

  get _state() {
    const len = this._stateStack.length;
    return len > 0 ? this._stateStack[len - 1] : null;
  }

  _assertState(expectedStates) {
    const state = this._state;
    for (const x of expectedStates) {
      if (x === state) {
        return;
      }
    }
    debugger;
    throw new Error('Invalid JSON construction');
  }

  startArray() {
    this._assertState([null, STATE_KEY, STATE_ARR]);
    this._stateStack.push(STATE_ARR);
    if (DEBUG_JSON) {
      this._json += '[';
    }
    this.onShardAdded('[');
  }

  endArray() {
    this._assertState([STATE_ARR]);
    this._stateStack.pop();
    if (this._state === STATE_KEY) {
      this._stateStack.pop();
    }
    if (DEBUG_JSON) {
      this._json += ']';
    }
    this.onShardAdded(']');
  }

  startObject() {
    this._assertState([null, STATE_KEY, STATE_ARR]);
    this._stateStack.push(STATE_OBJ);
    if (DEBUG_JSON) {
      this._json += '{';
    }
    this.onShardAdded('{');
  }

  endObject() {
    this._assertState([STATE_OBJ]);
    this._stateStack.pop();
    if (this._state === STATE_KEY) {
      this._stateStack.pop();
    }
    if (DEBUG_JSON) {
      this._json += '}';
    }
    this.onShardAdded('}');
  }

  appendKey(key) {
    Utils.assert(Utils.isString(key));
    this._assertState([STATE_OBJ]);
    this._stateStack.push(STATE_KEY);
    const str = JSON.stringify(key) + ':';
    if (DEBUG_JSON) {
      this._json += str;
    }
    this.onShardAdded(str);
  }

  appendString(str) {
    Utils.assert(Utils.isString(str));
    this._assertState([null, STATE_ARR, STATE_KEY]);
    this.onShardAdded(JSON.stringify(str));
    if (this._state === STATE_KEY) {
      this._stateStack.pop();
    }
  }

  appendNumber(n) {
    Utils.assert(Utils.isNumber(n));
    this._assertState([null, STATE_ARR, STATE_KEY]);
    this.onShardAdded(JSON.stringify(n));
    if (this._state === STATE_KEY) {
      this._stateStack.pop();
    }
  }

  appendBool(bool) {
    this._assertState([null, STATE_ARR, STATE_KEY]);
    this.onShardAdded(bool ? 'true' : 'false');
    if (this._state === STATE_KEY) {
      this._stateStack.pop();
    }
  }

  appendNull() {
    this._assertState([null, STATE_ARR, STATE_KEY]);
    this.onShardAdded('null');
    if (this._state === STATE_KEY) {
      this._stateStack.pop();
    }
  }

  appendSet(s) {
    this._assertState([null, STATE_ARR, STATE_KEY]);
    const checksums = [];
    const stream = new this.constructor();
    for (const v of s) {
      stream.appendValue(v);
      checksums.push(stream.getValue());
      stream.reset();
    }
    checksums.sort();
    stream.appendValue(checksums);
    this.onShardAdded(`^${stream.getValue()}^`);
    if (this._state === STATE_KEY) {
      this._stateStack.pop();
    }
  }

  appendValue(v) {
    if (Utils.isString(v)) {
      this.appendString(v);
      return;
    }

    if (Utils.isNumber(v)) {
      this.appendNumber(v);
      return;
    }

    if (Utils.isBoolean(v)) {
      this.appendBool(v);
      return;
    }

    if (v === null) {
      this.appendNull();
      return;
    }

    if (Utils.isArray(v)) {
      this.startArray();
      for (let x of v) {
        this.appendValue(x);
      }
      this.endArray();
      return;
    }

    if (v instanceof Set) {
      this.appendSet(v);
    }

    if (Utils.isObject(v)) {
      const keys = Object.keys(v).sort();
      this.startObject();
      for (let k of keys) {
        this.appendKey(k);
        this.appendValue(v[k]);
      }
      this.endObject();
      return;
    }
  }
}

export class MD5Checksum extends ChecksumStream {
  reset() {
    super.reset();
    this._md5State = StreamMD5.init();
  }

  onShardAdded(str) {
    super.onShardAdded(str);
    StreamMD5.update(this._md5State, str);
  }

  getValue() {
    super.getValue();
    return StreamMD5.finalize(this._md5State);
  }
}
