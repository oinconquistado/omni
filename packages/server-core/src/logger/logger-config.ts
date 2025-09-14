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
      level: (label) => ({ level: label.toUpperCase() }),
    },
  }

  if (pretty) {
    return pino(pinoConfig, pino.destination(1))
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
      level: (label: string) => ({ level: label.toUpperCase() }),
    },
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
        },
      },
    }
  }

  return baseConfig
}
