import { initializeSentry } from "@repo/server-core"

initializeSentry({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  appName: "omni-admin-server",
  release: process.env.npm_package_version,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  sendDefaultPii: true,
})
