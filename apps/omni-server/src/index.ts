import type { ApiResponse } from "@repo/shared-types"
import Fastify from "fastify"

const fastify = Fastify({
  logger: true
})

fastify.get("/", async (): Promise<ApiResponse<{ message: string }>> => {
  return {
    success: true,
    data: { message: "Omni Server API" }
  }
})

const start = async () => {
  try {
    await fastify.listen({ port: 3002 })
    console.log("🚀 Omni Server running on http://localhost:3002")
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()