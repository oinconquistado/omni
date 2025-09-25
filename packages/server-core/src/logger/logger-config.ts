import pino from "pino"

export interface LoggerConfig {
  level?: string
  pretty?: boolean
  appName?: string
}

export function createLogger(config: LoggerConfig = {}) {
  const { level = "info", pretty = process.env.NODE_ENV !== "production", appName = "server" } = config

  const pinoConfig: pino.LoggerOptions = {
    level,
    name: appName,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        if (label === null) return { level: "NULL" }
        if (label === undefined) return { level: "UNDEFINED" }
        if (label === "") return { level: "" }
        return { level: label.toUpperCase() }
      },
    },
  }

  if (pretty) {
    // Use o formato de configuração consistente com createFastifyLogger
    return pino({
      ...pinoConfig,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
          singleLine: true,
        },
      },
    })
  }

  return pino(pinoConfig)
}

export function createFastifyLogger(config: LoggerConfig = {}) {
  const { level = "info", pretty = process.env.NODE_ENV !== "production", appName = "server" } = config

  const baseConfig = {
    level,
    name: appName,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => {
        if (label === null) return { level: "NULL" }
        if (label === undefined) return { level: "UNDEFINED" }
        if (label === "") return { level: "" }
        return { level: label.toUpperCase() }
      },
    },
    hooks: {
      logMethod(inputArgs: any[], method: any) {
        // Filtrar logs de "Server listening at"
        const message = inputArgs[0]
        if (typeof message === 'string' && message.includes('Server listening at')) {
          return // Não faz log dessa mensagem
        }
        return method.apply(this, inputArgs)
      }
    }
  }

  if (pretty) {
    return {
      ...baseConfig,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
          singleLine: true,
          // Desabilita o buffering para garantir formatação imediata
          sync: true,
        },
      },
    }
  }

  return baseConfig
}
