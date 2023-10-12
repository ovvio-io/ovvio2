import { Server, ServiceName } from './server.ts';

/**
 * Services are published by the server to enable all components to access the
 * relevant bits of data. For example database access, caches, etc can all be
 * exposed as server services.
 */
export abstract class BaseService<
  SN extends string = string,
  T extends Server = Server
> {
  abstract readonly name: SN;

  constructor(readonly server: T) {}

  start(): void {}

  stop(): void {}
}

/**
 * A simple service that holds a pre-determined value. Used to share state
 * between different server components.
 */
export class ValueService<T extends ServiceName, DT> extends BaseService<T> {
  public value: DT;
  constructor(readonly server: Server, readonly name: T, value: DT) {
    super(server);
    this.value = value;
  }
}
