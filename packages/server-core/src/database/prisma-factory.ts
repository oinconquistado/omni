import type { PrismaClientLike } from "../types/server-config"

export interface PrismaClientConfig {
  databaseUrl?: string
  logLevel?: "query" | "info" | "warn" | "error"[]
}

export interface PrismaSchemaConfig {
  schemaPath: string
  outputPath: string
  config?: PrismaClientConfig
}

// Small utility to create a PrismaSchemaConfig generically
export function getSchemaConfig(params: PrismaSchemaConfig): PrismaSchemaConfig {
  return params
}

export function createPrismaClientFromSchema(
  schemaConfig: PrismaSchemaConfig,
  logger: import("pino").Logger,
): PrismaClientLike {
  try {
    if (process.env.DEBUG || process.env.NODE_ENV === "development") {
      logger.debug(
        {
          outputPath: schemaConfig.outputPath,
          schemaPath: schemaConfig.schemaPath,
        },
        "🔍 Loading Prisma client",
      )
    }
    const { PrismaClient } = require(schemaConfig.outputPath)

    const client: PrismaClientLike = new PrismaClient({
      datasourceUrl: schemaConfig.config?.databaseUrl || process.env.DATABASE_URL,
      log: schemaConfig.config?.logLevel
        ? [{ level: schemaConfig.config.logLevel as "query" | "info" | "warn" | "error", emit: "stdout" }]
        : undefined,
    })

    if (process.env.DEBUG || process.env.NODE_ENV === "development") {
      logger.debug("🔗 Prisma client created successfully")
    }
    return client
  } catch {
    throw new Error(
      `Prisma client not found at ${schemaConfig.outputPath}. Make sure to run 'prisma generate' with the schema at ${schemaConfig.schemaPath}.`,
    )
  }
}
