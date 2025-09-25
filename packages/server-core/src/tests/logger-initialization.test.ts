import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createFastifyLogger, createLogger } from "../logger/logger-config"

describe("Logger initialization", () => {
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
    // Limpar o módulo para testes
    vi.resetModules()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it("should create logger with pretty formatting immediately", async () => {
    // A verificação aqui é mais uma garantia de que não existem erros durante
    // a inicialização da configuração do pretty logger
    const logger = createLogger({ pretty: true, appName: "test-logger" })
    expect(logger).toBeDefined()

    // Não podemos testar diretamente a saída formatada, mas podemos verificar se a configuração foi aplicada
    expect(logger.level).toBe("info")
  })

  it("should create fastify logger with pretty formatting immediately", () => {
    const loggerConfig = createFastifyLogger({ pretty: true, appName: "test-fastify-logger" })

    expect(loggerConfig).toBeDefined()
    expect(loggerConfig).toHaveProperty("transport")
    if ("transport" in loggerConfig) {
      expect(loggerConfig.transport).toHaveProperty("target", "pino-pretty")
      expect(loggerConfig.transport).toHaveProperty("options")
      if (loggerConfig.transport && typeof loggerConfig.transport === "object" && "options" in loggerConfig.transport) {
        expect(loggerConfig.transport.options).toHaveProperty("sync", true)
      }
    }
  })

  it("should prioritize sync option for pretty formatting", () => {
    const loggerConfig = createFastifyLogger({ pretty: true })

    if (
      "transport" in loggerConfig &&
      loggerConfig.transport &&
      typeof loggerConfig.transport === "object" &&
      "options" in loggerConfig.transport
    ) {
      expect(loggerConfig.transport.options).toHaveProperty("sync", true)
    }
  })
})
