export function getRequestPath<T extends string = string>(req: Request): T {
  return new URL(req.url).pathname.toLowerCase() as T;
}
