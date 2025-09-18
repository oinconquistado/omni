import "./instrument"

import { PrismaClient } from "@omni/admin-client"
import { configureServer, registerRoutes } from "@repo/server-core"

import { createUserRoutes } from "./routes/admin-routes"

const prisma = new PrismaClient()

const start = async () => {
  const server = await configureServer({
    name: "Omni Admin Server",
    version: "1.0.0",
    port: 3003,
    description: "Admin server for Omni platform",
    database: { client: prisma },
  })

  const adminRoutesRegistrator = createUserRoutes(prisma)
  await registerRoutes(server.instance, [adminRoutesRegistrator])

  await server.start()
}

start()
