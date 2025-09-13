import { beforeAll, afterAll, beforeEach, afterEach } from "vitest"
import { dbManager } from "../services/database-clients.js"
import { redisClient } from "../services/redis-client.js"

beforeAll(async () => {
  process.env.NODE_ENV = "test"
  process.env.OMNI_DATABASE_URL =
    process.env.TEST_OMNI_DATABASE_URL || "postgresql://test:test@localhost:5432/omni_test"
  process.env.SHARED_DATABASE_URL =
    process.env.TEST_SHARED_DATABASE_URL || "postgresql://test:test@localhost:5432/omni_shared_test"
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || "redis://localhost:6379/1"

  try {
    await dbManager.connect()
    await redisClient.getClient().ping()
  } catch (error) {
    console.error("Failed to connect to test databases:", error)
  }
})

afterAll(async () => {
  try {
    await dbManager.disconnect()
    await redisClient.disconnect()
  } catch (error) {
    console.error("Failed to disconnect from test databases:", error)
  }
})

beforeEach(async () => {
  await redisClient.flush()
})

afterEach(async () => {
  try {
    await redisClient.flush()
  } catch (error) {
    console.error("Failed to clear test cache:", error)
  }
})
