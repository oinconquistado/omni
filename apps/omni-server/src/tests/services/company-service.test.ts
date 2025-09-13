import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { companyService } from "../../services/company-service.js"
import { cleanupTestDatabase, createTestUser } from "../helpers/test-database.js"
import { userFixtures, clientFixtures, sessionFixtures } from "../fixtures/user-fixtures.js"

describe("CompanyService", () => {
  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  afterEach(async () => {
    await cleanupTestDatabase()
  })

  describe("User Management", () => {
    describe("createUser", () => {
      it("should create user with valid data", async () => {
        const userData = userFixtures.validUser

        const user = await companyService.createUser(userData)

        expect(user).toBeDefined()
        expect(user.email).toBe(userData.email)
        expect(user.name).toBe(userData.name)
        expect(user.role).toBe(userData.role)
        expect(user.status).toBe(userData.status)
        expect(user.id).toBeDefined()
        expect(user.createdAt).toBeDefined()
      })

      it("should create user with default values", async () => {
        const userData = {
          email: "minimal@example.com",
          name: "Minimal User",
        }

        const user = await companyService.createUser(userData)

        expect(user).toBeDefined()
        expect(user.role).toBe("SUPPORT")
        expect(user.status).toBe("ACTIVE")
      })

      it("should throw error for duplicate email", async () => {
        const userData = userFixtures.validUser

        await companyService.createUser(userData)

        await expect(companyService.createUser(userData)).rejects.toThrow()
      })

      it("should throw error for invalid email format", async () => {
        const userData = {
          ...userFixtures.validUser,
          email: "invalid-email",
        }

        await expect(companyService.createUser(userData)).rejects.toThrow()
      })
    })

    describe("getUserById", () => {
      it("should return user when valid id provided", async () => {
        const createdUser = await createTestUser(userFixtures.validUser)

        const user = await companyService.getUserById(createdUser.id)

        expect(user).toBeDefined()
        expect(user!.id).toBe(createdUser.id)
        expect(user!.email).toBe(createdUser.email)
      })

      it("should return null when user not found", async () => {
        const user = await companyService.getUserById("non-existent-id")

        expect(user).toBeNull()
      })
    })

    describe("getUserByEmail", () => {
      it("should return user when valid email provided", async () => {
        const createdUser = await createTestUser(userFixtures.validUser)

        const user = await companyService.getUserByEmail(createdUser.email)

        expect(user).toBeDefined()
        expect(user!.id).toBe(createdUser.id)
        expect(user!.email).toBe(createdUser.email)
      })

      it("should return null when user not found", async () => {
        const user = await companyService.getUserByEmail("nonexistent@example.com")

        expect(user).toBeNull()
      })
    })

    describe("updateUser", () => {
      it("should update user successfully", async () => {
        const createdUser = await createTestUser(userFixtures.validUser)

        const updatedData = {
          name: "Updated Name",
          role: "ADMIN" as const,
        }

        const updatedUser = await companyService.updateUser(createdUser.id, updatedData)

        expect(updatedUser).toBeDefined()
        expect(updatedUser!.name).toBe(updatedData.name)
        expect(updatedUser!.role).toBe(updatedData.role)
        expect(updatedUser!.updatedAt).not.toBe(createdUser.updatedAt)
      })

      it("should return null when updating non-existent user", async () => {
        const updatedUser = await companyService.updateUser("non-existent-id", {
          name: "Updated Name",
        })

        expect(updatedUser).toBeNull()
      })
    })
  })

  describe("Client Management", () => {
    describe("createClient", () => {
      it("should create client with valid data", async () => {
        const clientData = clientFixtures.validClient

        const client = await companyService.createClient(clientData)

        expect(client).toBeDefined()
        expect(client.tenantId).toBe(clientData.tenantId)
        expect(client.companyName).toBe(clientData.companyName)
        expect(client.contactEmail).toBe(clientData.contactEmail)
        expect(client.status).toBe(clientData.status)
      })

      it("should throw error for duplicate tenant id", async () => {
        const clientData = clientFixtures.validClient

        await companyService.createClient(clientData)

        await expect(companyService.createClient(clientData)).rejects.toThrow()
      })
    })

    describe("getClientByTenantId", () => {
      it("should return client when valid tenant id provided", async () => {
        const createdClient = await companyService.createClient(clientFixtures.validClient)

        const client = await companyService.getClientByTenantId(createdClient.tenantId)

        expect(client).toBeDefined()
        expect(client!.tenantId).toBe(createdClient.tenantId)
      })

      it("should return null when client not found", async () => {
        const client = await companyService.getClientByTenantId("non-existent-tenant")

        expect(client).toBeNull()
      })
    })
  })

  describe("Session Management", () => {
    describe("createSession", () => {
      it("should create session with valid data", async () => {
        const user = await createTestUser(userFixtures.validUser)
        const sessionData = {
          ...sessionFixtures.validSession,
          userId: user.id,
        }

        const session = await companyService.createSession(sessionData)

        expect(session).toBeDefined()
        expect(session.userId).toBe(user.id)
        expect(session.token).toBe(sessionData.token)
        expect(session.expiresAt).toEqual(sessionData.expiresAt)
      })

      it("should throw error for duplicate token", async () => {
        const user = await createTestUser(userFixtures.validUser)
        const sessionData = {
          ...sessionFixtures.validSession,
          userId: user.id,
        }

        await companyService.createSession(sessionData)

        await expect(companyService.createSession(sessionData)).rejects.toThrow()
      })
    })

    describe("getSessionByToken", () => {
      it("should return session when valid token provided", async () => {
        const user = await createTestUser(userFixtures.validUser)
        const createdSession = await companyService.createSession({
          ...sessionFixtures.validSession,
          userId: user.id,
        })

        const session = await companyService.getSessionByToken(createdSession.token)

        expect(session).toBeDefined()
        expect(session!.token).toBe(createdSession.token)
        expect(session!.userId).toBe(user.id)
      })

      it("should return null when session not found", async () => {
        const session = await companyService.getSessionByToken("non-existent-token")

        expect(session).toBeNull()
      })
    })
  })
})
