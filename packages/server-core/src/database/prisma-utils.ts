export interface DatabaseConnection {
  connected: boolean
  latency?: number
}

export async function checkDatabaseHealth(prisma: {
  $queryRaw: (query: any) => Promise<any>
}): Promise<DatabaseConnection> {
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
