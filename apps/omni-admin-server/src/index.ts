import "@/instrument"

import { PrismaClient } from "@omni/admin-client"
import { startUnifiedServer } from "@repo/server-core"

const prisma = new PrismaClient()

const start = async () => {
  const port = Number(process.env.PORT) || 3003
  const serverName = "Omni Admin Server"
  const version = "1.0.0"

  await startUnifiedServer({
    name: serverName,
    version,
    port,
    description: "Admin server for Omni platform",
    logger: {
      level: process.env.LOG_LEVEL || "info",
      pretty: process.env.NODE_ENV !== "production",
    },
    swagger: true,
    database: { client: prisma },
    health: true,
    api: true,
    enableSentryDebugRoute: true,
    autoPortFallback: true,
  })
}

start()
