import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"

export async function registerRequestLogging(fastify: FastifyInstance): Promise<void> {
  await fastify.register(import("@fastify/request-context"))

  fastify.addHook("onRequest", async (request: FastifyRequest, _reply: FastifyReply) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        userAgent: request.headers["user-agent"],
        ip: request.ip,
        requestId: request.id,
      },
      "Incoming request",
    )
  })

  fastify.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    const responseTime = reply.elapsedTime

    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: `${responseTime}ms`,
        requestId: request.id,
      },
      "Request completed",
    )
  })

  fastify.addHook("onError", async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
    request.log.error(
      {
        method: request.method,
        url: request.url,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        requestId: request.id,
      },
      "Request error",
    )
  })
}
