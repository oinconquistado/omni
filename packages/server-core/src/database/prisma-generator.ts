import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

export interface PrismaGenerateOptions {
  schemaPath: string
  cwd?: string
  silent?: boolean
  log?: (message: string) => void
}

export async function generatePrismaClient(options: PrismaGenerateOptions): Promise<void> {
  const { schemaPath, cwd = process.cwd(), silent = false, log } = options

  const resolvedSchemaPath = resolve(cwd, schemaPath)

  if (!existsSync(resolvedSchemaPath)) {
    throw new Error(`Prisma schema not found at: ${resolvedSchemaPath}`)
  }

  const logMessage = (message: string) => {
    if (log) {
      log(message)
    } else if (!silent) {
      console.log(message)
    }
  }

  logMessage(`🔧 Generating Prisma client from ${schemaPath}...`)

  return new Promise((resolve, reject) => {
    const prismaProcess = spawn("npx", ["prisma", "generate", "--schema", resolvedSchemaPath], {
      cwd,
      stdio: silent ? "pipe" : "inherit",
    })

    let errorOutput = ""

    if (silent) {
      prismaProcess.stderr?.on("data", (data) => {
        errorOutput += data.toString()
      })
    }

    prismaProcess.on("close", (code) => {
      if (code === 0) {
        logMessage(`✅ Prisma client generated successfully`)
        resolve()
      } else {
        const error = new Error(`Prisma generate failed with code ${code}${errorOutput ? `\n${errorOutput}` : ""}`)
        reject(error)
      }
    })

    prismaProcess.on("error", (error) => {
      reject(new Error(`Failed to spawn prisma generate process: ${error.message}`))
    })
  })
}

export async function ensurePrismaClient(options: PrismaGenerateOptions): Promise<void> {
  try {
    await generatePrismaClient(options)
  } catch (error) {
    throw new Error(`Failed to ensure Prisma client: ${(error as Error).message}`)
  }
}
