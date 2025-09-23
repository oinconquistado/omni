import "dotenv/config"
import { startUnifiedServer } from "@repo/server-core"

const start = async () => {
  await startUnifiedServer({
    name: "Omni Tenant Server",
    version: "1.0.0",
    port: 3004,
    description: "Tenant server for Omni platform",
    database: {
      schema: {
        schemaPath: "./prisma/schema.prisma",
        outputPath: "@omni/tenant-client",
      },
    },
  })
}

start()
