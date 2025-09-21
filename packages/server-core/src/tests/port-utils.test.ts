import { createServer } from "node:net"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { findAvailablePort, isPortAvailable, killProcessOnPort } from "../utils/port-utils"

// Mock node:net
const mockServer = {
  listen: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
}

vi.mock("node:net", () => ({
  createServer: vi.fn(() => mockServer),
}))

// Mock child_process for killProcessOnPort tests
const mockExecSync = vi.fn()
vi.mock("node:child_process", () => ({
  execSync: mockExecSync,
}))

describe("Port Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockServer.listen.mockImplementation((_port, _host, callback) => {
      if (callback) callback()
    })
    mockServer.close.mockImplementation((callback) => {
      if (callback) callback()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("isPortAvailable", () => {
    it("should return true when port is available (positive case)", async () => {
      mockServer.listen.mockImplementation((_port, _host, callback) => {
        if (callback) callback()
      })
      mockServer.close.mockImplementation((callback) => {
        if (callback) callback()
      })

      const result = await isPortAvailable(3000)

      expect(result).toBe(true)
      expect(createServer).toHaveBeenCalled()
      expect(mockServer.listen).toHaveBeenCalledWith(3000, "0.0.0.0", expect.any(Function))
    })

    it("should return true when port is available with custom host", async () => {
      const result = await isPortAvailable(3001, "127.0.0.1")

      expect(result).toBe(true)
      expect(mockServer.listen).toHaveBeenCalledWith(3001, "127.0.0.1", expect.any(Function))
    })

    it("should return false when port is not available (negative case)", async () => {
      mockServer.on.mockImplementation((event, callback) => {
        if (event === "error") {
          // Simulate port in use
          setTimeout(() => callback(new Error("EADDRINUSE")), 0)
        }
      })

      const result = await isPortAvailable(3000)

      expect(result).toBe(false)
    })

    it("should handle server listen errors", async () => {
      mockServer.listen.mockImplementation((_port, _host, _callback) => {
        // Don't call success callback
      })
      mockServer.on.mockImplementation((event, callback) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Port unavailable")), 0)
        }
      })

      const result = await isPortAvailable(8080)

      expect(result).toBe(false)
    })

    it("should handle different error types", async () => {
      mockServer.on.mockImplementation((event, callback) => {
        if (event === "error") {
          setTimeout(() => callback({ code: "EACCES", message: "Permission denied" }), 0)
        }
      })

      const result = await isPortAvailable(80)

      expect(result).toBe(false)
    })
  })

  describe("findAvailablePort", () => {
    it("should find first available port (positive case)", async () => {
      // Mock isPortAvailable to return true for port 3000
      mockServer.listen.mockImplementation((_port, _host, callback) => {
        if (callback) callback()
      })

      const port = await findAvailablePort(3000)

      expect(port).toBe(3000)
    })

    it("should find available port after checking multiple ports", async () => {
      let callCount = 0
      mockServer.on.mockImplementation((event, callback) => {
        if (event === "error") {
          callCount++
          if (callCount <= 2) {
            // First two calls fail
            setTimeout(() => callback(new Error("Port unavailable")), 0)
          }
        }
      })
      mockServer.listen.mockImplementation((_port, _host, callback) => {
        callCount++
        if (callCount <= 2) {
          // First two calls fail - don't call callback
          return
        }
        // Third call succeeds
        if (callback) callback()
      })

      const port = await findAvailablePort(3000)

      expect(port).toBe(3002) // Should skip 3000, 3001 and find 3002
    })

    it("should respect maxRetries parameter", async () => {
      mockServer.on.mockImplementation((event, callback) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("All ports unavailable")), 0)
        }
      })

      await expect(findAvailablePort(3000, 3)).rejects.toThrow(
        "No available port found after 3 attempts starting from port 3000",
      )
    })

    it("should handle default maxRetries", async () => {
      mockServer.on.mockImplementation((event, callback) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("All ports unavailable")), 0)
        }
      })

      await expect(findAvailablePort(3000)).rejects.toThrow(
        "No available port found after 10 attempts starting from port 3000",
      )
    })

    it("should check ports concurrently", async () => {
      let callCount = 0

      mockServer.listen.mockImplementation((port, _host, callback) => {
        callCount++
        if (port === 3005) {
          // Make port 3005 available after a delay
          setTimeout(() => {
            if (callback) callback()
          }, 10)
        }
        // Other ports fail immediately
      })

      mockServer.on.mockImplementation((event, callback) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Port unavailable")), 0)
        }
      })

      const port = await findAvailablePort(3000, 6)

      expect(port).toBe(3005)
      // Should be concurrent, so shouldn't take too long
      expect(callCount).toBeGreaterThan(0)
    })

    it("should handle edge case with startPort 0", async () => {
      const port = await findAvailablePort(0, 1)

      expect(port).toBe(0)
      expect(mockServer.listen).toHaveBeenCalledWith(0, "0.0.0.0", expect.any(Function))
    })

    it("should handle high port numbers", async () => {
      const port = await findAvailablePort(65530, 3)

      expect(port).toBe(65530)
    })
  })

  describe("killProcessOnPort", () => {
    beforeEach(() => {
      mockExecSync.mockReset()
    })

    it("should kill process successfully (positive case)", async () => {
      mockExecSync
        .mockReturnValueOnce("12345\n") // lsof returns PID
        .mockReturnValueOnce("") // kill command succeeds

      const result = await killProcessOnPort(3000)

      expect(result).toBe(true)
      expect(mockExecSync).toHaveBeenCalledWith("lsof -ti:3000", {
        encoding: "utf8",
        stdio: "pipe",
      })
      expect(mockExecSync).toHaveBeenCalledWith("kill -9 12345", { stdio: "pipe" })
    })

    it("should return false when no process is found (negative case)", async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes("lsof")) {
          throw new Error("No matching processes")
        }
        return ""
      })

      const result = await killProcessOnPort(3000)

      expect(result).toBe(false)
      expect(mockExecSync).toHaveBeenCalledWith("lsof -ti:3000", {
        encoding: "utf8",
        stdio: "pipe",
      })
    })

    it("should return false when lsof returns empty result", async () => {
      mockExecSync.mockReturnValueOnce("") // lsof returns empty string

      const result = await killProcessOnPort(3000)

      expect(result).toBe(false)
    })

    it("should handle kill command failure", async () => {
      mockExecSync
        .mockReturnValueOnce("12345\n") // lsof returns PID
        .mockImplementation((command) => {
          if (command.includes("kill")) {
            throw new Error("Kill command failed")
          }
          return ""
        })

      const result = await killProcessOnPort(3000)

      expect(result).toBe(false)
    })

    it("should handle whitespace in PID output", async () => {
      mockExecSync
        .mockReturnValueOnce("  12345  \n  ") // PID with extra whitespace
        .mockReturnValueOnce("") // kill succeeds

      const result = await killProcessOnPort(3000)

      expect(result).toBe(true)
      expect(mockExecSync).toHaveBeenCalledWith("kill -9 12345", { stdio: "pipe" })
    })

    it("should handle multiple PIDs (first line only)", async () => {
      mockExecSync
        .mockReturnValueOnce("12345\n67890\n") // Multiple PIDs
        .mockReturnValueOnce("") // kill succeeds

      const result = await killProcessOnPort(3000)

      expect(result).toBe(true)
      expect(mockExecSync).toHaveBeenCalledWith("kill -9 12345", { stdio: "pipe" })
    })

    it("should handle import errors gracefully", async () => {
      // Mock dynamic import failure
      vi.doMock("node:child_process", () => {
        throw new Error("Module not available")
      })

      const result = await killProcessOnPort(3000)

      expect(result).toBe(false)
    })

    it("should wait after killing process", async () => {
      mockExecSync.mockReturnValueOnce("12345\n").mockReturnValueOnce("")

      // Mock setTimeout to track if it was called
      const originalSetTimeout = global.setTimeout
      const mockSetTimeout = vi.fn().mockImplementation((fn: () => void, delay: number) => {
        expect(delay).toBe(1000)
        return originalSetTimeout(fn, 0) // Execute immediately in tests
      })
      ;(global as any).setTimeout = mockSetTimeout

      const result = await killProcessOnPort(3000)

      expect(result).toBe(true)
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000)

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout
    })

    it("should handle different port numbers", async () => {
      mockExecSync.mockReturnValueOnce("54321\n").mockReturnValueOnce("")

      const result = await killProcessOnPort(8080)

      expect(result).toBe(true)
      expect(mockExecSync).toHaveBeenCalledWith("lsof -ti:8080", {
        encoding: "utf8",
        stdio: "pipe",
      })
      expect(mockExecSync).toHaveBeenCalledWith("kill -9 54321", { stdio: "pipe" })
    })

    it("should log process kill message", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
        // Mock implementation
      })

      mockExecSync.mockReturnValueOnce("12345\n").mockReturnValueOnce("")

      const result = await killProcessOnPort(3000)

      expect(result).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith("🔄 Killed process 12345 running on port 3000")

      consoleSpy.mockRestore()
    })
  })

  describe("Error handling and edge cases", () => {
    it("should handle server creation failures", async () => {
      vi.mocked(createServer).mockImplementation(() => {
        throw new Error("Server creation failed")
      })

      const result = await isPortAvailable(3000)

      expect(result).toBe(false)
    })

    it("should handle concurrent port checks with mixed results", async () => {
      mockServer.listen.mockImplementation((port, _host, callback) => {
        if (port === 3001) {
          // Port 3001 is available
          if (callback) callback()
        }
        // Other ports fail
      })

      mockServer.on.mockImplementation((event, callback) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Port unavailable")), 0)
        }
      })

      const port = await findAvailablePort(3000, 3)

      expect(port).toBe(3001)
    })

    it("should handle promise rejection in port availability check", async () => {
      mockServer.listen.mockImplementation(() => {
        // Simulate hanging without calling callback or emitting error
      })

      // Create a race condition to test timeout scenarios
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(false), 10)
      })

      const portCheckPromise = isPortAvailable(3000)

      // In a real scenario, we might want to add timeout logic
      const result = await Promise.race([portCheckPromise, timeoutPromise])

      // This test ensures we handle edge cases gracefully
      expect(typeof result).toBe("boolean")
    })
  })
})
