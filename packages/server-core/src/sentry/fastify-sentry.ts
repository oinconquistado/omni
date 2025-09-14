import * as Sentry from "@sentry/node"
import type { FastifyInstance } from "fastify"

export async function registerSentryErrorHandler(fastify: FastifyInstance): Promise<void> {
  if (!Sentry.isInitialized()) {
    console.warn("Sentry not initialized, skipping error handler registration")
    return
  }

  Sentry.setupFastifyErrorHandler(fastify)

  fastify.log.info("Sentry error handler registered with Fastify")
}

export async function registerSentryDebugRoute(fastify: FastifyInstance): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    return
  }

  fastify.get(
    "/debug-sentry",
    {
      schema: {
        description: "Debug route to test Sentry error reporting",
        tags: ["Debug"],
        response: {
          500: {
            description: "Intentional error for Sentry testing",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async () => {
      throw new Error("Test Sentry error - this is intentional!")
    },
  )

  fastify.log.info("Sentry debug route registered at /debug-sentry")
}
