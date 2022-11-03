import { isServerSide } from '../../../../styles/utils/ssr.ts';
import config from '../config.ts';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export type Currency = string;

type StandardEvents = {
  AddPaymentInfo: {
    content_category?: string;
    content_ids?: string;
    contents?: string;
    currency?: Currency;
    value?: number;
  };
  AddToCart: {
    content_ids?: string;
    content_name?: string;
    content_type?: string;
    contents?: string;
    currency?: Currency;
    value?: number;
  };
  AddToWishlist: {};
  CompleteRegistration: {
    content_name?: string;
    currency?: Currency;
    status: string;
    value: number;
  };
  Contact: {};
  CustomizeProduct: {};
  Donate: {};
  FindLocation: {};
  InitiateCheckout: {};
  Lead: {
    content_category?: string;
    content_name?: string;
    currency?: Currency;
    value?: string;
  };
  PageView: {};
  Purchase: {};
  Schedule: {};
  Search: {};
  StartTrial: {
    currency?: Currency;
    predicted_ltv?: string;
    value?: number;
  };
  SubmitApplication: {};
  Subscribe: {
    currency?: Currency;
    predicted_ltv?: string;
    value?: number;
  };
  ViewContent: {};
};

export interface FacebookEventsClient {
  track<K extends keyof StandardEvents>(
    event: K,
    data?: StandardEvents[K]
  ): void;
  trackCustom(event: string, data?: Record<string, any>): void;
}

const FBClient: FacebookEventsClient = {
  track<K extends keyof StandardEvents>(event: K, data?: StandardEvents[K]) {
    window.fbq('track', event, data);
  },
  trackCustom(event, data) {
    window.fbq('trackCustom', event, data);
  },
};

const dummyClient: FacebookEventsClient = {
  track() {},
  trackCustom() {},
};

let isInitialized = false;

export function initFacebookClient(pixelId: string) {
  if (!isInitialized) {
    /* eslint-disable */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod
          ? n.callMethod.apply(n, arguments)
          : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      'script',
      'https://connect.facebook.net/en_US/fbevents.js'
    );
    /* eslint-enable */
    window.fbq('init', pixelId);
    isInitialized = true;
  }
  return FBClient;
}

export const FacebookClient =
  isServerSide || !config.events.facebook.enabled
    ? dummyClient
    : initFacebookClient(config.events.facebook.pixelId);
