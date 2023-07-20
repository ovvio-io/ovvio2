import { BaseConfig } from '@ovvio/base';
import { EnvVars } from '@ovvio/base/lib/utils';

interface ConfigSchema {
  apiUrl: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    databaseURL?: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  diffServer: string;
  pdfServer: string;
  userEventsUrl: string;
  appInstallations: {
    windows: string;
    mac: string;
  };
  emailDomain: string;
  allowEditorCrashes?: boolean;
  origin: string;
  events: {
    google: {
      enabled: boolean;
    };
    facebook:
      | {
          enabled: true;
          pixelId: string;
        }
      | { enabled: false };
  };
}

class WebAppConfig extends BaseConfig<ConfigSchema> {
  get dev(): ConfigSchema {
    return {
      apiUrl: 'https://api-dev.ovvio.io',
      firebase: {
        apiKey: 'AIzaSyBEuF-nox8XwCxL4yH5kzZAg-3Bl23ZC8I',
        authDomain: 'ovvio-dev.firebaseapp.com',
        databaseURL: 'https://ovvio-dev.firebaseio.com',
        projectId: 'ovvio-dev',
        storageBucket: 'ovvio-dev.appspot.com',
        messagingSenderId: '695593368875',
        appId: '1:695593368875:web:07af51f330d7b33a',
        measurementId: 'G-BDEEVC2GXY',
      },
      diffServer: 'wss://collab-dev.ovvio.io/connect',
      pdfServer: 'https://html2pdf-dev.ovvio.io/conv/',
      userEventsUrl: 'https://userevents-dev.ovvio.io/',
      appInstallations: {
        windows:
          'https://storage.googleapis.com/installations-dev.ovvio.io/app/windows/eff14526a98e9a11915340114e68553f2/x64/latest/Ovvio-Dev.setup.exe',
        mac: 'https://storage.googleapis.com/installations-dev.ovvio.io/app/mac/7e71ec57b1353dcbb4fc08d9597e74cc/x64/latest/Ovvio-Dev.setup.dmg',
      },
      emailDomain: 'app-dev.ovvio.io',
      origin: 'https://app-dev.ovvio.io',
      events: {
        google: {
          enabled: false,
        },
        facebook: {
          enabled: false,
        },
      },
    };
  }
  get dev2(): ConfigSchema {
    return {
      apiUrl: 'https://api-dev2.ovvio.io',
      firebase: {
        apiKey: 'AIzaSyBnFhT5lII6WGYvwF-QqwvmFGtyHE61A4k',
        authDomain: 'ovvio-dev2.firebaseapp.com',
        projectId: 'ovvio-dev2',
        storageBucket: 'ovvio-dev2.appspot.com',
        messagingSenderId: '232952471691',
        appId: '1:232952471691:web:59d4b30983c3fc5aa6f48e',
        measurementId: 'G-N03GL17Y1Z',
      },
      diffServer: 'wss://collab-dev2.ovvio.io/connect',
      pdfServer: 'https://html2pdf-dev2.ovvio.io/conv/',
      userEventsUrl: 'https://userevents-dev2.ovvio.io/',
      appInstallations: {
        windows:
          'https://storage.googleapis.com/installations-dev2.ovvio.io/app/windows/eff14526a98e9a11915340114e68553f2/x64/latest/Ovvio-Dev2.setup.exe',
        mac: 'https://storage.googleapis.com/installations-dev2.ovvio.io/app/mac/7e71ec57b1353dcbb4fc08d9597e74cc/x64/latest/Ovvio-Dev2.setup.dmg',
      },
      emailDomain: 'app-dev2.ovvio.io',
      allowEditorCrashes: true,
      origin: 'https://app-dev2.ovvio.io',
      events: {
        google: {
          enabled: false,
        },
        facebook: {
          enabled: false,
        },
      },
    };
  }

  get stage(): ConfigSchema {
    return {
      apiUrl: 'https://api-stg.ovvio.io',
      firebase: {
        apiKey: 'AIzaSyCHoR1d70fRjDLlSL3ZbdLLzqh_pcq301Q',
        authDomain: 'ovvio-stage.firebaseapp.com',
        databaseURL: 'https://ovvio-stage.firebaseio.com',
        projectId: 'ovvio-stage',
        storageBucket: 'ovvio-stage.appspot.com',
        messagingSenderId: '694987024891',
        appId: '1:694987024891:web:9f62efca7411eea341435e',
        measurementId: 'G-V5G1MSPYFH',
      },
      diffServer: 'wss://collab-stg.ovvio.io/connect',
      pdfServer: 'https://html2pdf-stg.ovvio.io/conv/',
      userEventsUrl: 'https://userevents-stg.ovvio.io/',
      appInstallations: {
        windows:
          'https://storage.googleapis.com/installations-stg.ovvio.io/app/windows/27e5a8f30a4cc074dc0d252be9c39c142/x64/latest/Ovvio-Stage.setup.exe',
        mac: 'https://storage.googleapis.com/installations-stg.ovvio.io/app/mac/340065d0f2265196638d2befb5c3547f/x64/latest/Ovvio-Stage.setup.dmg',
      },
      emailDomain: 'app-stg.ovvio.io',
      origin: 'https://app-stg.ovvio.io',
      events: {
        google: {
          enabled: false,
        },
        // facebook: {
        //   enabled: false,
        // },
        facebook: {
          enabled: true,
          pixelId: '2918108948428256',
        },
      },
    };
  }

  get prod(): ConfigSchema {
    return {
      diffServer: 'wss://collab.ovvio.io/connect',
      apiUrl: 'https://api.ovvio.io',
      pdfServer: 'https://html2pdf.ovvio.io/conv/',
      firebase: {
        apiKey: 'AIzaSyDI2S-vJa35w88OF7aE7rED7AY5-R2u3Zo',
        authDomain: 'ovvio-prod.firebaseapp.com',
        databaseURL: 'https://ovvio-prod.firebaseio.com',
        projectId: 'ovvio-prod',
        storageBucket: 'ovvio-prod.appspot.com',
        messagingSenderId: '402799549473',
        appId: '1:402799549473:web:ee7b8d9684ae45d7a59760',
        measurementId: 'G-1W6YXL0CXH',
      },
      userEventsUrl: 'https://userevents.ovvio.io/',
      appInstallations: {
        windows:
          'https://installations.ovvio.io/app/windows/x64/latest/Ovvio.setup.exe',
        mac: 'https://installations.ovvio.io/app/mac/x64/latest/Ovvio.setup.dmg',
      },
      emailDomain: 'app.ovvio.io',
      origin: 'https://app.ovvio.io',
      events: {
        google: {
          enabled: true,
        },
        facebook: {
          enabled: true,
          pixelId: '2918108948428256',
        },
      },
    };
  }

  localOverride(config: ConfigSchema): void {
    config.apiUrl = EnvVars.get('USERS_API_URL', config.apiUrl)!;
    config.diffServer = EnvVars.get('DIFF_SERVER_GW_URL', config.diffServer)!;
    config.userEventsUrl = EnvVars.get(
      'USER_EVENTS_API_EXTERNAL_URL',
      config.userEventsUrl
    )!;
  }
}

const config = new WebAppConfig().getConfig();

export default config;
