import "@/instrument"

import { PrismaClient } from "@omni/tenant-client"
import { startUnifiedServer } from "@repo/server-core"

const prisma = new PrismaClient()

const start = async () => {
  await startUnifiedServer({
    name: "Omni Tenant Server",
    version: "1.0.0",
    port: 3004,
    description: "Tenant server for Omni platform",
    database: { client: prisma },
  })
}

start()
