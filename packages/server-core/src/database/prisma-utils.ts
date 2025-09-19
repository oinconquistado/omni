import type { PrismaClientLike } from "../types/server-config"

export interface DatabaseConnection {
  connected: boolean
  latency?: number
}

export async function checkDatabaseHealth(prisma: Pick<PrismaClientLike, "$queryRaw">): Promise<DatabaseConnection> {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start

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
