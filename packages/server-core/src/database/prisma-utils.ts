import type { PrismaClientLike } from "../types/server-config"

export interface DatabaseConnection {
  connected: boolean
  latency?: number
}

export async function checkDatabaseHealth(prisma: Pick<PrismaClientLike, "$queryRaw">): Promise<DatabaseConnection> {
  try {
    const start = Date.now()
    // Debug: start ping
    console.log("[server-core][DB] Health check: starting ping")
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    console.log("[server-core][DB] Health check: success", { latency })
    return {
      connected: true,
      latency,
    }
  } catch {
    console.log("[server-core][DB] Health check: failed")
    return {
      connected: false,
    }
  }
}
