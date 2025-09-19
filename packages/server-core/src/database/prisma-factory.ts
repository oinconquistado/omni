export interface PrismaClientConfig {
  databaseUrl?: string
  logLevel?: "query" | "info" | "warn" | "error"[]
}

export interface PrismaSchemaConfig {
  schemaPath: string
  outputPath: string
  config?: PrismaClientConfig
}

export function createPrismaClientFromSchema(schemaConfig: PrismaSchemaConfig): any {
  try {
    const { PrismaClient } = require(schemaConfig.outputPath)

    return new PrismaClient({
      datasourceUrl: schemaConfig.config?.databaseUrl || process.env.DATABASE_URL,
      log: schemaConfig.config?.logLevel ? [{ level: schemaConfig.config.logLevel as any, emit: "stdout" }] : undefined,
    })
  } catch {
    throw new Error(
      `Prisma client not found at ${schemaConfig.outputPath}. Make sure to run 'prisma generate' with the schema at ${schemaConfig.schemaPath}.`,
    )
  }
}
