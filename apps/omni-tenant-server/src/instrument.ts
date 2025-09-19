import { initializeSentry } from "@repo/server-core"
import dotenv from "dotenv"

// Carrega as variáveis de ambiente do .env
dotenv.config()

console.log("🔍 SENTRY_DSN from env:", process.env.SENTRY_DSN)
console.log("🔍 NODE_ENV:", process.env.NODE_ENV)

// Only initialize Sentry automatically in production or when explicitly requested
// In tests, let each test configure Sentry as needed to avoid conflicts
if (process.env.NODE_ENV === "production" || process.env.FORCE_SENTRY_INIT === "true") {
  initializeSentry({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    appName: "omni-tenant-server",
    release: process.env.npm_package_version,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    sendDefaultPii: true,
  })

  console.log("🔧 Sentry instrumentation loaded")
} else {
  console.log("🔧 Sentry instrumentation skipped (test environment or not forced)")
}
