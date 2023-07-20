import { KeyboardEvent } from 'react';
import { JSONObject } from '../../../../../base/interfaces.ts';
import { isMacOS } from '../../../utils.ts';

export enum Platform {
  Mac,
  Windows,
}

export const CURRENT_PLATFORM = isMacOS() ? Platform.Mac : Platform.Windows;

export enum MetaKeys {
  Alt = 'alt',
  Ctrl = 'ctrl',
  Shift = 'shift',
  Meta = 'meta',
}

const META_KEY_MAP: Record<MetaKeys, keyof KeyboardEvent> = {
  [MetaKeys.Alt]: 'altKey',
  [MetaKeys.Ctrl]: 'ctrlKey',
  [MetaKeys.Shift]: 'shiftKey',
  [MetaKeys.Meta]: 'metaKey',
};

export interface Hotkey {
  metaKeys: MetaKeys[];
  key: string;
}

export interface Shortcut {
  default: Hotkey;
  [Platform.Mac]?: Hotkey;
  [Platform.Windows]?: Hotkey;
}

export function getPlatformHotkey(shortcut: Shortcut): Hotkey {
  const hotkey = shortcut[CURRENT_PLATFORM] || shortcut.default;
  if (CURRENT_PLATFORM !== Platform.Mac) {
    return {
      ...hotkey,
      metaKeys: hotkey.metaKeys.map((x) =>
        x === MetaKeys.Meta ? MetaKeys.Ctrl : x
      ),
    };
  }
  return hotkey;
}

const codeA = 'a'.charCodeAt(0);
const codeZ = 'z'.charCodeAt(0);

const KEY_MAP: JSONObject = {};
for (let key = codeA; key <= codeZ; key++) {
  const char = String.fromCharCode(key);
  KEY_MAP[char] = `Key${char.toUpperCase()}`;
}

export function isKeyPressed(event: KeyboardEvent, key: string): boolean {
  const keyCode = KEY_MAP[key];
  const keyCodePressed = keyCode && event.nativeEvent.code === keyCode;
  return keyCodePressed || event.key === key;
}

export function isHotkeyActive(event: KeyboardEvent, hotkey: Hotkey): boolean {
  return (
    isKeyPressed(event, hotkey.key) &&
    hotkey.metaKeys.every((k) => event[META_KEY_MAP[k]])
  );
}

export function makeHandler(
  shortcut: Shortcut,
  handler: (event: KeyboardEvent) => void
) {
  const hotkey = getPlatformHotkey(shortcut);

  return (e: KeyboardEvent) => {
    if (!isHotkeyActive(e, hotkey)) {
      return;
    }
    handler(e);
  };
}
