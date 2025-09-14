import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"

export async function registerRequestLogging(fastify: FastifyInstance): Promise<void> {
  await fastify.register(import("@fastify/request-context"))

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
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

  // Use onSend to ensure request ID is always added to headers, even for errors
  fastify.addHook("onSend", async (request: FastifyRequest, reply: FastifyReply, payload) => {
    reply.header("x-request-id", request.id)
    return payload
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
