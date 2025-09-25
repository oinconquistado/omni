import "dotenv/config"
import { join } from "node:path"
import { configureServer, type PrismaSchemaConfig } from "@repo/server-core"

// Pre-carregando o módulo pino-pretty para garantir que ele esteja disponível imediatamente
import "pino-pretty"

const start = async () => {
  const server = await configureServer({
    name: "Omni Tenant Server",
    version: "1.0.0",
    port: 3004,
    description: "Tenant server for Omni platform",
    logger: {
      pretty: true,
      level: process.env.LOG_LEVEL || "info",
    },
    database: {
      schema: {
        schemaPath: join(__dirname, "../prisma/schema.prisma"),
        outputPath: "@omni/tenant-client",
        config: {
          databaseUrl: process.env.TENANT_DATABASE_URL,
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
