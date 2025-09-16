import * as Sentry from "@sentry/node"
import type { FastifyInstance } from "../types/fastify-types"

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
      const error = new Error("Test Sentry error - this is intentional!")

      // Captura manualmente o erro no Sentry e força o envio
      Sentry.captureException(error)

      // Força o flush para enviar imediatamente
      try {
        await Sentry.flush(2000) // timeout de 2 segundos
        console.log("✅ Sentry event sent successfully")
      } catch (flushError) {
        console.error("❌ Failed to flush Sentry event:", flushError)
      }

      throw error
    },
  )

  fastify.log.info("Sentry debug route registered at /debug-sentry")
}
