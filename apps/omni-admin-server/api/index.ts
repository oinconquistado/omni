import { join } from "node:path"
import { configureServer, type PrismaSchemaConfig } from "@repo/server-core"
import "dotenv/config"

const start = async () => {
  const server = await configureServer({
    name: "Omni Admin Server",
    version: "1.0.0",
    port: 3003,
    description: "Admin server for Omni platform",
    database: {
      schema: {
        schemaPath: join(__dirname, "../prisma/schema.prisma"),
        outputPath: "@omni/admin-client",
        config: {
          databaseUrl: process.env.ADMIN_DATABASE_URL,
        },
      } satisfies PrismaSchemaConfig,
    },
    autoRoutes: {
      enabled: true,
      apiPath: join(__dirname, "../api"),
      defaultMethod: "GET",
    },
  })

  await server.start()
}

start()
