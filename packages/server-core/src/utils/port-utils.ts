import { createServer } from "node:net"

export async function findAvailablePort(startPort: number, maxRetries = 10): Promise<number> {
  const ports = Array.from({ length: maxRetries }, (_, i) => startPort + i)

  // Check all ports concurrently
  const availabilityChecks = ports.map(async (port) => ({
    port,
    available: await isPortAvailable(port),
  }))

  const results = await Promise.all(availabilityChecks)
  const availablePort = results.find((result) => result.available)

  if (availablePort) {
    return availablePort.port
  }

  throw new Error(`No available port found after ${maxRetries} attempts starting from port ${startPort}`)
}

export async function isPortAvailable(port: number, host = "0.0.0.0"): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()

    server.listen(port, host, () => {
      server.close(() => {
        resolve(true)
      })
    })

    server.on("error", () => {
      resolve(false)
    })
  })
}

export async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    const { execSync } = await import("node:child_process")

    // Try to find and kill process on the port
    try {
      const result = execSync(`lsof -ti:${port}`, { encoding: "utf8", stdio: "pipe" })
      const pid = result.trim()

      if (pid) {
        execSync(`kill -9 ${pid}`, { stdio: "pipe" })
        console.log(`🔄 Killed process ${pid} running on port ${port}`)

        // Wait a bit for the process to actually die
        await new Promise((resolve) => setTimeout(resolve, 1000))

        return true
      }
    } catch {
      // No process found or couldn't kill it
      return false
    }

    return false
  } catch {
    return false
  }
}
