import type { FastifyInstance } from "../types/fastify-types"

export interface StartServerConfig {
  port: number
  host?: string
  name: string
}

export async function startServer(fastify: FastifyInstance, config: StartServerConfig): Promise<void> {
  try {
    const host = config.host || "0.0.0.0"

    await fastify.listen({ port: config.port, host })

    fastify.log.info(`🚀 ${config.name} running on http://localhost:${config.port}`)
    fastify.log.info(`🌐 ${config.name} accessible on network at http://0.0.0.0:${config.port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
