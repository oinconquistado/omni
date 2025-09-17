import "@/instrument"

import { PrismaClient } from "@omni/admin-client"
import { startUnifiedServer } from "@repo/server-core"

const prisma = new PrismaClient()

const start = async () => {
  await startUnifiedServer({
    name: "Omni Admin Server",
    version: "1.0.0",
    port: 3003,
    description: "Admin server for Omni platform",
    database: { client: prisma },
  })
}

start()
