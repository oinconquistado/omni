import { join } from "node:path"
import { configureServer, registerDeclarativeRoutes } from "@repo/server-core"
import "dotenv/config"

const start = async () => {
  const server = await configureServer({
    name: "Omni Admin Server",
    version: "1.0.0",
    port: 3003,
    description: "Admin server for Omni platform",
    database: {
      schema: {
        schemaPath: "./prisma/schema.prisma",
        outputPath: "@omni/admin-client",
      },
    },
  })

  // Register declarative routes
  await registerDeclarativeRoutes(server.instance, {
    routesPath: join(__dirname, "routes"),
    database: server.instance.database as any,
  })

  await server.start()
}

start()
