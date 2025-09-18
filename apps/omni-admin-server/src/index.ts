import { join } from "node:path"
import { PrismaClient } from "@omni/admin-client"
import { configureServer, registerDeclarativeRoutes } from "@repo/server-core"
import "./instrument"

const prisma = new PrismaClient()

const start = async () => {
  const server = await configureServer({
    name: "Omni Admin Server",
    version: "1.0.0",
    port: 3003,
    description: "Admin server for Omni platform",
    database: { client: prisma },
  })

  // Register declarative routes
  await registerDeclarativeRoutes(server.instance, {
    routesPath: join(__dirname, "routes"),
    database: prisma as any,
  })

  await server.start()
}

start()
