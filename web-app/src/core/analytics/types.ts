import {
  CardEventActions,
  GeneralEventActions,
  TagEventActions,
  WSEventActions,
} from './actions';
import { GlobalEventFields } from './global-fields';

export type GeneralActionNames = keyof GeneralEventActions;
export type GeneralActionFields<T extends GeneralActionNames> =
  GlobalEventFields & GeneralEventActions[T];

export type WSActionNames = keyof WSEventActions;
export type WSActionFields<T extends WSActionNames> = Omit<
  GlobalEventFields,
  'workspaceId'
> &
  WSEventActions[T];

export type CardActionNames = keyof CardEventActions;
export type CardActionFields<T extends CardActionNames> = Omit<
  GlobalEventFields,
  'workspaceId' | 'cardId' | 'parentCardId'
> &
  CardEventActions[T];

export type TagActionNames = keyof TagEventActions;
export type TagActionFields<T extends TagActionNames> = Omit<
  GlobalEventFields,
  'workspaceId' | 'tagId' | 'parentTagId'
> &
  TagEventActions[T] & { tagUnion: boolean };
