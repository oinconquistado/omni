import "dotenv/config"
import { getSchemaConfig, startUnifiedServer } from "@repo/server-core"

const start = async () => {
  await startUnifiedServer({
    name: "Omni Tenant Server",
    version: "1.0.0",
    port: 3004,
    description: "Tenant server for Omni platform",
    database: {
      schema: getSchemaConfig("tenant"),
    },
  })
}

start()
