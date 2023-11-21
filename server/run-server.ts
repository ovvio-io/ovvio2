import { Server } from '../net/server/server.ts';
import { staticAssetsFromJS } from "../net/server/static-assets.ts";
import encodedStaticAsses from '../build/staticAssets.json' with { type: "json" };

async function main(): Promise<void> {
  const staticAssets = staticAssetsFromJS(encodedStaticAsses)
  const server = new Server();
  await server.setup();
  (await server.servicesForOrganization('localhost')).staticAssets = staticAssets;
  await server.start();
}

main();
