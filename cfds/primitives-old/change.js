import Utils from '@ovvio/base/lib/utils';

export class BaseChange {
  get type() {
    Utils.notImplemented();
  }

  toJSImpl() {
    Utils.notImplemented();
  }

  toJS() {
    return {
      t: this.type,
      d: this.toJSImpl(),
    };
  }

  static fromJS(obj) {
    Utils.notImplemented();
  }
}

const TYPE_MAP = {};

export function registerType(type, cls) {
  Utils.assert(!TYPE_MAP[type], `Change type "${type}" already registered`);
  Utils.assert(
    cls.toJS === BaseChange.toJS,
    "Overriding toJS() isn't allowed at this time"
  );
  TYPE_MAP[type] = cls;
}

export function fromJS(obj) {
  const cls = TYPE_MAP[obj.t];
  Utils.assert(cls, 'Unknown change type: ' + obj.t);
  return cls.fromJS(obj.d);
}

export default {
  BaseChange,
  registerType,
  fromJS,
};
