import "./instrument"

import { PrismaClient } from "@omni/admin-client"
import { configureServer, registerRoutes } from "@repo/server-core"

import { createAuthRoutes, createUserRoutes } from "./routes"

const prisma = new PrismaClient()

const start = async () => {
  const server = await configureServer({
    name: "Omni Admin Server",
    version: "1.0.0",
    port: 3003,
    description: "Admin server for Omni platform",
    database: { client: prisma },
  })

  const authRoutesRegistrator = createAuthRoutes(prisma)
  const userRoutesRegistrator = createUserRoutes(prisma)

  await registerRoutes(server.instance, [authRoutesRegistrator, userRoutesRegistrator])

  await server.start()
}

start()
