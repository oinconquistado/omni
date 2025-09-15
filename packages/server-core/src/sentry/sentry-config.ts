import * as Sentry from "@sentry/node"

export interface SentryConfig {
  dsn?: string
  environment?: string
  appName?: string
  release?: string
  tracesSampleRate?: number
  profilesSampleRate?: number
  sendDefaultPii?: boolean
}

export function initializeSentry(config: SentryConfig): void {
  if (!config.dsn) {
    console.warn("Sentry DSN not provided, skipping Sentry initialization")
    return
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment || process.env.NODE_ENV || "development",
    release: config.release || `${config.appName}@${process.env.npm_package_version || "unknown"}`,
    tracesSampleRate: config.tracesSampleRate || 1.0,
    profilesSampleRate: config.profilesSampleRate || 1.0,
    sendDefaultPii: config.sendDefaultPii ?? true,
    integrations: [Sentry.httpIntegration(), Sentry.nodeContextIntegration(), Sentry.fastifyIntegration()],
    beforeSend(event) {
      if (process.env.NODE_ENV === "development") {
        console.log("=== SENTRY EVENT CAPTURED ===")
        console.log("Event ID:", event.event_id)
        console.log("Exception:", event.exception)
        console.log("Message:", event.message)
        console.log("=== END SENTRY EVENT ===")
      }
      return event
    },
  })

  console.log(`Sentry initialized for ${config.appName} in ${config.environment} environment`)
}

export function isSentryInitialized(): boolean {
  return Sentry.isInitialized()
}

export { Sentry }
