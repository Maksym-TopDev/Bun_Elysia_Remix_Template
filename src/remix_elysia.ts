// from https://github.com/wladpaiva/elysia-remix/blob/main/remix-elysia.ts
import type { ServerBuild } from "@remix-run/node";
import { createRequestHandler as createRemixRequestHandler } from "@remix-run/node";

export function createRequestHandler({
  build,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild;
  mode?: string;
}) {
  let handleRequest = createRemixRequestHandler(build, mode);

  return async (request: Request) => {
    let response = await handleRequest(request);

    return response;
  };
}
