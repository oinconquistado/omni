import * as Sentry from "@sentry/node"

// In test environment, silence Sentry internal logs to avoid noisy stderr output
if (process.env.NODE_ENV === "test") {
  try {
    // Replace Sentry's logger with a noop implementation if available
    if (typeof (Sentry as { setLogger?: unknown }).setLogger === "function") {
      ;(Sentry as unknown as { setLogger: (logger: Record<string, () => void>) => void }).setLogger({
        log: () => void 0,
        debug: () => void 0,
        warn: () => void 0,
        error: () => void 0,
      })
    }
  } catch {
    // Ignore failures silently - tests should continue even if we can't set logger
  }
}

export interface SentryConfig {
  dsn?: string
  environment?: string
  appName?: string
  release?: string
  tracesSampleRate?: number
  profilesSampleRate?: number
  sendDefaultPii?: boolean
}

export function initializeSentry(config: SentryConfig, logger: import("pino").Logger): void {
  if (!config.dsn) {
    if (process.env.NODE_ENV !== "test") {
      logger.warn("⚠️  Sentry DSN not provided, skipping Sentry initialization")
    }
    return
  }

  // Suprimir warning de instrumentação manual do Fastify
  process.env.SENTRY_IGNORE_API_RESOLUTION_ERROR = "1"

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment || process.env.NODE_ENV || "development",
    release: config.release || `${config.appName}@${process.env.npm_package_version || "unknown"}`,
    tracesSampleRate: config.tracesSampleRate || 1.0,
    profilesSampleRate: config.profilesSampleRate || 1.0,
    sendDefaultPii: config.sendDefaultPii ?? true,
    integrations: [Sentry.httpIntegration(), Sentry.nodeContextIntegration()],
    beforeSend(event) {
      // Only print verbose Sentry event output during local development
      if (process.env.NODE_ENV === "development" && process.env.DEBUG) {
        logger.debug(`🐛 === SENTRY EVENT CAPTURED ===`)
        logger.debug(`🐛 Event ID: ${event.event_id}`)
        logger.debug(`🐛 Exception: ${JSON.stringify(event.exception)}`)
        logger.debug(`🐛 Message: ${event.message}`)
        logger.debug(`🐛 === END SENTRY EVENT ===`)
      }
      return event
    },
  })

  if (process.env.NODE_ENV !== "test") {
    logger.info(`🐛 Sentry initialized for ${config.appName} in ${config.environment} environment`)
  }
}

export function isSentryInitialized(): boolean {
  return Sentry.isInitialized()
}

export { Sentry }
