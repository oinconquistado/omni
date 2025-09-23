import type { PrismaClientLike } from "../types/server-config"
import { generatePrismaClient } from "./prisma-generator"

export interface PrismaClientConfig {
  databaseUrl?: string
  logLevel?: "query" | "info" | "warn" | "error"[]
}

export interface PrismaSchemaConfig {
  schemaPath: string
  outputPath: string
  config?: PrismaClientConfig
  autoGenerate?: boolean
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

export async function createPrismaClientWithAutoGenerate(schemaConfig: PrismaSchemaConfig): Promise<PrismaClientLike> {
  if (schemaConfig.autoGenerate !== false) {
    try {
      // Try to load existing client first
      return createPrismaClientFromSchema(schemaConfig)
    } catch {
      // If client not found, try to generate it
      console.log(`🔧 Prisma client not found, generating from ${schemaConfig.schemaPath}...`)

      await generatePrismaClient({
        schemaPath: schemaConfig.schemaPath,
        log: (message) => console.log(message),
      })

      // Try to load the client again after generation
      return createPrismaClientFromSchema(schemaConfig)
    }
  }

  return createPrismaClientFromSchema(schemaConfig)
}
