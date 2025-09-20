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
  await registerDeclarativeRoutes(server.instance as unknown as import("@repo/server-core").FastifyInstance, {
    routesPath: join(__dirname, "routes"),
    database: { client: server.instance.database as import("@repo/server-core").PrismaClientLike },
  })

  await server.start()
}

start()
