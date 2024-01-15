import * as dotenv from "dotenv"
dotenv.config()

import { v4 as uuidv4 } from "uuid"

import { logger } from "./logger/index"
import { broadcastDevReady } from "@remix-run/node"

import sourceMapSupport from "source-map-support"
sourceMapSupport.install()

// import * as build from "@remix-run/dev/server-build"
import * as build from "../build/index.js"
import Elysia from "elysia"
import staticPlugin from "@elysiajs/static"
import { createRequestHandler } from "./remix_elysia"

const listenPort = process.env.PORT || "8080"

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      HTTP_LOG?: string
      DSN: string
    }
  }
}

const app = new Elysia()
  .decorate("requestID", uuidv4())
  .derive((c) => {
    return {
      logger: logger.child({
        requestID: c.requestID,
      }),
    }
  })
  .state("counter", 0)
  .use(
    staticPlugin({ // serve remix public repo if anything matches
      prefix: "/",
      assets: "public"
    })
  )
  .onRequest((c) => {
    if (
      process.env.HTTP_LOG === "1"
      // !new URL(c.request.url).pathname.startsWith("/build")
    ) {
      logger.info(
        {
          method: c.request.method,
          url: c.request.url,
          id: c.requestID,
        },
        "http request"
      )
    }
  })
  .onAfterHandle((c) => {
    if (
      process.env.HTTP_LOG === "1" &&
      !new URL(c.request.url).pathname.startsWith("/build")
    ) {
      logger.info(
        {
          method: c.request.method,
          url: c.request.url,
          id: c.requestID,
          status: (c.response as Response).status,
        },
        "http response"
      )
    }
  })

app.get("/hc", (c) => {
  c.store.counter++
  // return new Response("ok")
  return {
    msg: 'ok',
    counter: c.store.counter
  }
}, {
  type: 'text' // force set the type of the request body
})

app.ws("/ws", {
  message(ws, message) {
    ws.data.logger.info({message}, "got message")
  },
  open(ws) {
    ws.data.logger.info("ws opened")
  },
})

// Send everything else to remix
app.mount(
  "/",
  createRequestHandler({
    // @ts-expect-error
    build,
  })
)
// app.use("/build/*", serveStatic({ root: "./public" }))
// app.use("*", remix({ build: build as any, mode: process.env.NODE_ENV as any }))

if (process.env.NODE_ENV === "development") {
  broadcastDevReady(build as any)
}

app.listen(listenPort)
logger.info(`API listening on port ${listenPort}`)

const signals = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGTERM: 15,
}

let stopping = false

Object.keys(signals).forEach((signal) => {
  process.on(signal, async () => {
    if (stopping) {
      return
    }
    stopping = true
    logger.info(`Received signal ${signal}, shutting down...`)
    logger.info("exiting...")
    await app.stop()
    logger.flush() // pino actually fails to flush, even with awaiting on a callback
    process.exit(0)
  })
})
