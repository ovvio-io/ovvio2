import { ServerServices } from './server.ts';

export function getRequestPath<T extends string = string>(req: Request): T {
  return new URL(req.url).pathname.toLowerCase() as T;
}

export function getBaseURL(services: ServerServices): string {
  return `https://${services.organizationId}.ovvio.io`;
}

export function getServerBaseURL(services: ServerServices): string {
  return `https://${services.settings.serverTenantId}.${services.organizationId}.ovvio.io`;
}
