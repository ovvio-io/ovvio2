import yargs from 'https://deno.land/x/yargs@v17.7.1-deno/deno.ts';
import { ConsoleLogStream } from '../../logging/console-stream.ts';
import { PrometheusLogStream } from '../../server/prometeus-stream.ts';
import { BaseServer } from './base-server.ts';
import { MetricsMiddleware, PrometheusMetricsEndpoint } from './metrics.ts';
import { StaticAssets, StaticAssetsEndpoint } from './static-assets.ts';
import { SyncEndpoint } from './sync.ts';
import { HealthCheckEndpoint } from './health.ts';
import { LogStream, log, setGlobalLoggerStreams } from '../../logging/log.ts';

interface Arguments {
  port: number;
  replicas: string[];
  dir: string;
  app: string;
  importMap?: string;
}

/**
 * A concrete server that composites all features needed for running Ovvio.
 */
export class OvvioServer extends BaseServer {
  private readonly _staticAssets: StaticAssetsEndpoint;
  private readonly _prometheusLogStream;
  private _server: Deno.Server | undefined;
  readonly logStreams: readonly LogStream[];

  constructor() {
    super();
    this._prometheusLogStream = new PrometheusLogStream();
    this.logStreams = [new ConsoleLogStream(), this._prometheusLogStream];
    this._staticAssets = new StaticAssetsEndpoint();
    setGlobalLoggerStreams(this.logStreams);
  }

  get staticAssets(): StaticAssets | undefined {
    return this._staticAssets.staticAssets;
  }

  set staticAssets(assets: StaticAssets | undefined) {
    this._staticAssets.staticAssets = assets;
  }

  async run(assets?: StaticAssets): Promise<void> {
    await this.shutdown();
    const args: Arguments = yargs(Deno.args)
      .option('port', {
        alias: 'p',
        type: 'number',
        description: 'The port on which the server accepts incoming requests',
        default: 8080,
      })
      .option('replicas', {
        alias: 'r',
        type: 'array',
        default: [],
        description: 'A list of replica URLs which this server will sync with',
      })
      .option('dir', {
        alias: 'd',
        description:
          'A full path to a local directory which will host all repositories managed by this server',
      })
      .demandOption(
        ['dir']
        // 'Please provide a local directory for this server'
      )
      // .demandOption(['app'], 'Please provide')
      .parse();

    // Monitoring
    this.registerMiddleware(new MetricsMiddleware(this.logStreams));
    this.registerEndpoint(
      new PrometheusMetricsEndpoint(this._prometheusLogStream)
    );

    // Sync
    this.registerEndpoint(new SyncEndpoint(args.dir, args.replicas));

    // Health check
    this.registerEndpoint(new HealthCheckEndpoint());

    // Static assets
    // NOTE: Since this catches all GET requests, it's important to register it
    // last.
    this._staticAssets.staticAssets = assets;
    this.registerEndpoint(this._staticAssets);
    log({
      severity: 'INFO',
      name: 'ServerStarted',
      value: 1,
      unit: 'Count',
      urls: args.replicas,
    });
    let resolve: () => void;
    const result = new Promise<void>((res) => {
      resolve = res;
    });
    this._server = Deno.serve(
      {
        port: args.port || 8080,
        onListen() {
          resolve();
        },
      },
      this.processRequest.bind(this)
    );
    return result;
  }

  async shutdown(): Promise<void> {
    if (this._server === undefined) {
      return;
    }
    await this._server.shutdown();
    this._server = undefined;
  }
}
