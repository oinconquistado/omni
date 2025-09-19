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

export function createPrismaClientFromSchema(schemaConfig: PrismaSchemaConfig): PrismaClientLike {
  try {
    const { PrismaClient } = require(schemaConfig.outputPath)

    return new PrismaClient({
      datasourceUrl: schemaConfig.config?.databaseUrl || process.env.DATABASE_URL,
      log: schemaConfig.config?.logLevel
        ? [{ level: schemaConfig.config.logLevel as "query" | "info" | "warn" | "error", emit: "stdout" }]
        : undefined,
    })
  } catch {
    throw new Error(
      `Prisma client not found at ${schemaConfig.outputPath}. Make sure to run 'prisma generate' with the schema at ${schemaConfig.schemaPath}.`,
    )
  }
}
