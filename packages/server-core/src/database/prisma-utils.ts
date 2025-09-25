import type { PrismaClientLike } from "../types/server-config"

export interface DatabaseConnection {
  connected: boolean
  latency?: number
}

export async function checkDatabaseHealth(
  prisma: Pick<PrismaClientLike, "$queryRaw">,
  logger: import("pino").Logger,
): Promise<DatabaseConnection> {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    if (process.env.DEBUG || process.env.NODE_ENV === "development") {
      logger.debug({ latency }, "💾 Database health check successful")
    }
    return {
      connected: true,
      latency,
    }
  } catch {
    return {
      connected: false,
    }
  }
}
