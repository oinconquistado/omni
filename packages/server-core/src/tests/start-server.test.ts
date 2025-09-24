import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { startServer } from "../utils/start-server"

describe("Start Server Utility", () => {
  let mockFastify: any
  let originalProcessExit: typeof process.exit

  beforeEach(() => {
    originalProcessExit = process.exit

    process.exit = vi.fn() as any

    mockFastify = {
      listen: vi.fn().mockResolvedValue(undefined),
      log: {
        error: vi.fn(),
        info: vi.fn(),
      },
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    process.exit = originalProcessExit
  })

  it("should start server successfully with default host", async () => {
    const config = {
      port: 3000,
      name: "test-server",
    }

    await startServer(mockFastify as any, config)

    expect(mockFastify.listen).toHaveBeenCalledWith({
      port: 3000,
      host: "0.0.0.0",
    })

    expect(mockFastify.log.info).toHaveBeenCalledWith("🚀 test-server running on http://localhost:3000")
    expect(mockFastify.log.info).toHaveBeenCalledWith("🌐 test-server accessible on network at http://0.0.0.0:3000")
  })

  it("should start server successfully with custom host", async () => {
    const config = {
      port: 8080,
      host: "127.0.0.1",
      name: "custom-server",
    }

    await startServer(mockFastify as any, config)

    expect(mockFastify.listen).toHaveBeenCalledWith({
      port: 8080,
      host: "127.0.0.1",
    })

    expect(mockFastify.log.info).toHaveBeenCalledWith("🚀 custom-server running on http://localhost:8080")
    expect(mockFastify.log.info).toHaveBeenCalledWith("🌐 custom-server accessible on network at http://0.0.0.0:8080")
  })

  it("should handle server startup errors", async () => {
    const error = new Error("Port already in use")
    mockFastify.listen.mockRejectedValue(error)

    const config = {
      port: 3000,
      name: "test-server",
    }

    await startServer(mockFastify as any, config)

    expect(mockFastify.log.error).toHaveBeenCalledWith(error)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it("should work with port 3001", async () => {
    const config = { port: 3001, name: "server1" }

    await startServer(mockFastify as any, config)

    expect(mockFastify.listen).toHaveBeenCalledWith({
      port: 3001,
      host: "0.0.0.0",
    })

    expect(mockFastify.log.info).toHaveBeenCalledWith("🚀 server1 running on http://localhost:3001")
  })

  it("should work with port 8000", async () => {
    const config = { port: 8000, name: "server2" }

    await startServer(mockFastify as any, config)

    expect(mockFastify.listen).toHaveBeenCalledWith({
      port: 8000,
      host: "0.0.0.0",
    })

    expect(mockFastify.log.info).toHaveBeenCalledWith("🚀 server2 running on http://localhost:8000")
  })

  it("should work with port 5432", async () => {
    const config = { port: 5432, name: "server3" }

    await startServer(mockFastify as any, config)

    expect(mockFastify.listen).toHaveBeenCalledWith({
      port: 5432,
      host: "0.0.0.0",
    })

    expect(mockFastify.log.info).toHaveBeenCalledWith("🚀 server3 running on http://localhost:5432")
  })

  it("should handle different server names", async () => {
    const config = {
      port: 3000,
      name: "my-awesome-api-server",
    }

    await startServer(mockFastify as any, config)

    expect(mockFastify.log.info).toHaveBeenCalledWith("🚀 my-awesome-api-server running on http://localhost:3000")
    expect(mockFastify.log.info).toHaveBeenCalledWith(
      "🌐 my-awesome-api-server accessible on network at http://0.0.0.0:3000",
    )
  })
})
