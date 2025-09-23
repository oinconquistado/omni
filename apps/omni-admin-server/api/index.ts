import { join } from "node:path"
import { AutoRouteDiscovery, configureServer } from "@repo/server-core"
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
        autoGenerate: true,
      },
    },
  })

  // Register auto-discovered routes from new API structure
  const autoRouteDiscovery = new AutoRouteDiscovery({
    apiPath: join(__dirname, "../api"),
    log: {
      debug: (data, message) => server.instance.log.debug(message || "", data),
      info: (data, message) => server.instance.log.info(message || "", data),
      warn: (data, message) => server.instance.log.warn(message || "", data),
      error: (data, message) => server.instance.log.error(message || "", data),
    },
    database: { client: server.instance.database as any },
  })

  await autoRouteDiscovery.registerRoutes(server.instance as any)

  await server.start()
}

start()
