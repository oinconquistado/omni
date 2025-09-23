import type { PrismaSchemaConfig } from "../database/prisma-factory"

/**
 * Default schema configurations for admin and tenant databases
 */
export const ADMIN_SCHEMA_CONFIG: PrismaSchemaConfig = {
  schemaPath: "./prisma/admin-schema.prisma",
  outputPath: "@omni/admin-client",
  config: {
    databaseUrl: process.env.ADMIN_DATABASE_URL,
  },
}

export const TENANT_SCHEMA_CONFIG: PrismaSchemaConfig = {
  schemaPath: "./prisma/tenant-schema.prisma",
  outputPath: "@omni/tenant-client",
  config: {
    databaseUrl: process.env.TENANT_DATABASE_URL,
  },
}

/**
 * Get schema config by name
 */
export function getSchemaConfig(schemaName: "admin" | "tenant"): PrismaSchemaConfig {
  switch (schemaName) {
    case "admin":
      return ADMIN_SCHEMA_CONFIG
    case "tenant":
      return TENANT_SCHEMA_CONFIG
    default:
      throw new Error(`Unknown schema: ${schemaName}`)
  }
}
