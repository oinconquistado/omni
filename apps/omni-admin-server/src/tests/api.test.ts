import type { ServerInstance } from "@repo/server-core"
import { configureServer } from "@repo/server-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("API Routes", () => {
  let server: ServerInstance

  beforeAll(async () => {
    server = await configureServer({
      name: "Test Server",
      version: "1.0.0",
      port: 3006,
    })

    await server.instance.ready()
  })

  afterAll(async () => {
    await server.stop()
  })

  it("should return API info on root endpoint", async () => {
    const response = await server.instance.inject({
      method: "GET",
      url: "/",
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data.message).toBe("Test Server")
    expect(body.data.version).toBe("1.0.0")
  })
})
