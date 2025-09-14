import "@/instrument"

import { PrismaClient } from "@prisma/client"
import {
  checkDatabaseHealth,
  createServer,
  registerApiRoutes,
  registerHealthRoutes,
  registerSentryDebugRoute,
  registerSentryErrorHandler,
  registerSwagger,
  startServer,
} from "@repo/server-core"

const prisma = new PrismaClient()

const start = async () => {
  const port = Number(process.env.PORT) || 3003
  const serverName = "Omni Admin Server"
  const version = "1.0.0"

  const fastify = await createServer({
    name: serverName,
    version,
    port,
    logger: {
      level: process.env.LOG_LEVEL || "info",
      pretty: process.env.NODE_ENV !== "production",
    },
  })

  await registerSwagger(fastify, {
    name: serverName,
    version,
    port,
  })

  await registerHealthRoutes(fastify, {
    checkDatabase: () => checkDatabaseHealth(prisma),
  })

  await registerApiRoutes(fastify, {
    name: serverName,
    version,
  })

  await registerSentryErrorHandler(fastify)
  await registerSentryDebugRoute(fastify)

  await startServer(fastify, {
    port,
    name: serverName,
  })
}

start()
