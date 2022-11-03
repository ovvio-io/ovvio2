import { CFDS_VERSION } from '../../../../cfds/base/defs.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  Tag,
  Workspace,
} from '../../../../cfds/client/graph/vertices/index.ts';
import WebClientBuilder, {
  WebEventsClient,
} from '@ovvio/user-event/lib/client/webEventsClient';
import { SessionInfo } from 'app/login';
import config from 'core/config';
import { isElectron } from 'electronUtils';
import { Analytics, getAnalytics, logEvent } from 'firebase/analytics';
import { getApp } from 'firebase/app';
import React, { useContext, useEffect, useState } from 'react';
import { CurrentUser, SessionOrigin } from 'stores/user';
import pkg from '../../../package.json';
import { IndexedDBBuffer } from '../indexed-db/analytics-index-db';
import { canUseIndexedDB } from '../indexed-db/base';
import { EventCategory } from './categories';
import { FacebookClient } from './facebook';
import {
  CardActionFields,
  CardActionNames,
  GeneralActionFields,
  GeneralActionNames,
  TagActionFields,
  TagActionNames,
  WSActionFields,
  WSActionNames,
} from './types';

export { EventCategory } from './categories';
export const { version: PACKAGE_VERSION } = pkg;

export const BUILD_NUMBER = Utils.EnvVars.get('BUILD_NUMBER');

interface ErrorEvent {
  origin: string;
  source?: string;
  category?: EventCategory;
  cardId?: string;
  parentCardId?: string;
  workspaceId?: string;
}

export class EventLogger {
  private _eventsClient: WebEventsClient;
  private _currentUser?: CurrentUser;
  private _analytics: Analytics;

  constructor(sessionInfo?: SessionInfo) {
    if (sessionInfo && sessionInfo.user) {
      this._currentUser = sessionInfo.user.user;

      const builder = new WebClientBuilder(
        config.userEventsUrl,
        this._currentUser.id
      )
        .setAuthTokenFunc(() => this._currentUser.getToken())
        .setBaseValue('cfds_version', CFDS_VERSION)
        .setBaseValue('session_id', sessionInfo.sessionId)
        .setBaseValue('version', PACKAGE_VERSION);

      if (canUseIndexedDB()) {
        builder.setBuffer(new IndexedDBBuffer(this._currentUser.id));
      }

      if (isElectron()) {
        const appVersion = window
          .require('electron')
          .ipcRenderer.sendSync('get-version');
        builder.setBaseValue('electron_version', appVersion);
      }

      if (BUILD_NUMBER && BUILD_NUMBER.length > 0) {
        builder.setBaseValue('build_number', BUILD_NUMBER);
      }
      this._eventsClient = builder.build();
      this._analytics = getAnalytics(getApp());

      const fn = (message: string, extra: any, err: any) => {
        if (err) {
          const event: GeneralActionFields<'ERROR_LOG'> = {
            data: {
              logMessage: message,
              errorName: err.name,
              errorMessage: typeof err === 'string' ? err : err.message,
              errorStack: err.stack,
            },
          };
          if (extra) {
            if (extra.cardId) event.cardId = extra.cardId;
            if (extra.category) event.category = extra.category;
            if (extra.parentCardId) event.parentCardId = extra.parentCardId;
            if (extra.source) event.source = extra.source;
            if (extra.workspaceId) event.workspaceId = extra.workspaceId;
            if (extra.origin) event.data.errorOrigin = extra.origin;

            if (extra.event) {
              if (
                extra.event.action !== undefined &&
                extra.event.action === 'ERROR_LOG'
              ) {
                //Double error log: stop the cycle
                return;
              }
            }
          }

          this.action('ERROR_LOG', event);
        }
      };

      addSeverityListener(logger.Severity.ERROR, fn);
      addSeverityListener(logger.Severity.FATAL, fn);

      switch (this._currentUser.origin) {
        case SessionOrigin.SIGN_UP:
          this.action('SIGNED_UP', {
            data: {
              pathName: window.location.pathname,
              utm_source: sessionInfo.searchParams.utmSource,
              utm_medium: sessionInfo.searchParams.utmMedium,
              utm_campaign: sessionInfo.searchParams.utmCampaign,
              inviteId: sessionInfo.searchParams.inviteId,
              gclid: sessionInfo.searchParams.gcLid,
            },
          });
          this.action('SIGNED_IN', {});
          break;
        case SessionOrigin.SIGN_IN:
          this.action('SIGNED_IN', {});
          break;
      }

      this.action('SESSION_START', {
        data: {
          pathName: window.location.pathname,
          utm_source: sessionInfo.searchParams.utmSource,
          utm_medium: sessionInfo.searchParams.utmMedium,
          utm_campaign: sessionInfo.searchParams.utmCampaign,
          inviteId: sessionInfo.searchParams.inviteId,
          gclid: sessionInfo.searchParams.gcLid,
        },
      });

      console.log(
        `Session ${sessionInfo.sessionId} Started for userId: ${sessionInfo.user.id}. App Version: ${PACKAGE_VERSION}, CFDS Version: ${CFDS_VERSION}, BUILD_NUMBER: ${BUILD_NUMBER}`
      );
    }
  }

  get bufferSize() {
    return this._eventsClient ? this._eventsClient.bufferSize : 0;
  }

  /*
  temp function to log ovvio user-events + GA
  should be removed when we enable all events for ovvio user-events
  */
  // function t<T extends keyof GeneralEventActions>(
  //   action: T,
  //   v: GeneralActionFields<T>
  // ) {

  action<T extends GeneralActionNames>(
    action: T,
    event: GeneralActionFields<T>
  ) {
    this._internalAction(action, event);
  }

  private _internalAction(action: string, event: any) {
    if (!event.category) event.category = EventCategory.GENERAL;

    if (event.cardId) {
      //cleanup cardId
      if (event.cardId.startsWith('notes/')) {
        event.cardId = event.cardId.substring(6);
      }
    }

    if (this._eventsClient) {
      this._eventsClient.send(action, event);
    } else {
      console.error(`Action: ${action} will not log for ovvio`);
    }

    this._logGA(action, event);
    FacebookClient.trackCustom(action, event);
  }

  wsAction<T extends WSActionNames>(
    action: T,
    workspaceManager: Workspace | VertexManager<Workspace>,
    event: WSActionFields<T>
  ) {
    (event as any).workspaceId = workspaceManager.key;
    this._internalAction(action, event);
  }

  cardAction<T extends CardActionNames>(
    action: T,
    cardManager: Note | VertexManager<Note>,
    event: CardActionFields<T>
  ) {
    const card =
      cardManager instanceof Note ? cardManager : cardManager.getVertexProxy();

    (event as any).cardId = card.key;
    (event as any).workspaceId = card.workspace.key;
    (event as any).parentCardId = card.parentNote?.key;

    this._internalAction(action, event);
  }

  tagAction<T extends TagActionNames>(
    action: T,
    tagManager: Tag | VertexManager<Tag>,
    event: TagActionFields<T>
  ) {
    const tag =
      tagManager instanceof Tag ? tagManager : tagManager.getVertexProxy();

    (event as any).tagId = tag.key;
    (event as any).workspaceId = tag.workspaceKey;
    (event as any).parentTagId = tag.parentTagKey;

    this._internalAction(action, event);
  }

  cardActionAsync<T extends CardActionNames>(
    action: T,
    cardManager: Note | VertexManager<Note>,
    event: CardActionFields<T>
  ) {
    const ts = Date.now();
    return new Promise<void>((res) => {
      event.timestamp = ts;
      this.cardAction(action, cardManager, event);
      res();
    });
  }

  error(err: any, event: ErrorEvent) {
    Logger.error(`${event.origin} Failed`, err, event);
  }

  wsError(
    err: any,
    ws: VertexManager<Workspace> | Workspace,
    event: ErrorEvent
  ) {
    event.workspaceId = ws.key;
    this.error(err, event);
  }

  cardError(
    err: any,
    cardManager: Note | VertexManager<Note>,
    event: ErrorEvent
  ) {
    const card =
      cardManager instanceof Note ? cardManager : cardManager.getVertexProxy();

    event.workspaceId = card.workspace.key;
    event.cardId = card.key;
    event.parentCardId = card.parentNote?.key;
    this.error(err, event);
  }

  private _logGA(action: string, event: any = { category: 'general' }) {
    if (config.events.google.enabled) {
      logEvent(this._analytics, action, event);
    }

    event.timestamp = Date.now();
    if (config.isProduction) {
      Logger.debug(`EVENT: ${action} - ${JSON.stringify(event)}`);
    } else {
      Logger.info(`EVENT: ${action} - ${JSON.stringify(event)}`);
    }
  }

  close() {
    if (this._eventsClient) {
      if (this._currentUser && this._currentUser.signingOutStarted) {
        this.action('SIGNED_OUT', {});
      } else {
        this._eventsClient.close();
      }
    }
  }
}

const eventLoggerContext = React.createContext(new EventLogger());

interface EventLoggerProviderProps {
  eventLogger?: EventLogger;
  sessionInfo?: SessionInfo;
  children: any;
}
export function EventLoggerProvider({
  sessionInfo,
  eventLogger,
  children,
}: EventLoggerProviderProps) {
  const [logger, setLogger] = useState(eventLogger);
  useEffect(() => {
    if (!eventLogger && !sessionInfo) {
      setLogger(null);
      return;
    }

    const newLogger = eventLogger || new EventLogger(sessionInfo);
    setLogger(newLogger);
    const unloadHandler = (e) => {
      eventLogger.action('SESSION_END', {});
      eventLogger.close();
    };

    window.addEventListener('unload', unloadHandler);
    return () => {
      window.removeEventListener('unload', unloadHandler);
      newLogger.action('SESSION_END', {});
      newLogger.close();
    };
  }, [sessionInfo, eventLogger]);
  return (
    <eventLoggerContext.Provider value={logger}>
      {children}
    </eventLoggerContext.Provider>
  );
}

export function useEventLogger() {
  return useContext(eventLoggerContext);
}
