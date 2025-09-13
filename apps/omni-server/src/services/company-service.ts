import type { Client, ClientStatus, Session, User, UserRole, UserStatus } from "@omni/company-client"
import { companyDb } from "./database-clients.js"

export class CompanyService {
  async createUser(data: { email: string; name: string; role?: UserRole; status?: UserStatus }): Promise<User | null> {
    try {
      return await companyDb.user.create({
        data: {
          email: data.email,
          name: data.name,
          role: data.role || "SUPPORT",
          status: data.status || "ACTIVE",
        },
      })
    } catch (error) {
      console.error("Error creating user:", error)
      return null
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      return await companyDb.user.findUnique({
        where: { id },
        include: {
          sessions: {
            where: {
              expiresAt: {
                gte: new Date(),
              },
            },
          },
        },
      })
    } catch (error) {
      console.error("Error fetching user:", error)
      return null
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await companyDb.user.findUnique({
        where: { email },
        include: {
          sessions: {
            where: {
              expiresAt: {
                gte: new Date(),
              },
            },
          },
        },
      })
    } catch (error) {
      console.error("Error fetching user by email:", error)
      return null
    }
  }

  async updateUser(id: string, data: Partial<Pick<User, "name" | "role" | "status">>): Promise<User | null> {
    try {
      return await companyDb.user.update({
        where: { id },
        data,
      })
    } catch (error) {
      console.error("Error updating user:", error)
      return null
    }
  }

  async createSession(data: { userId: string; token: string; expiresAt: Date }): Promise<Session | null> {
    try {
      return await companyDb.session.create({
        data,
        include: {
          user: true,
        },
      })
    } catch (error) {
      console.error("Error creating session:", error)
      return null
    }
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    try {
      const session = await companyDb.session.findUnique({
        where: { token },
        include: {
          user: true,
        },
      })

      // Check if session is expired
      if (session && session.expiresAt < new Date()) {
        await this.deleteSession(session.id)
        return null
      }

      return session
    } catch (error) {
      console.error("Error fetching session:", error)
      return null
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      await companyDb.session.delete({
        where: { id },
      })
      return true
    } catch (error) {
      console.error("Error deleting session:", error)
      return false
    }
  }

  async deleteSessionByToken(token: string): Promise<boolean> {
    try {
      await companyDb.session.delete({
        where: { token },
      })
      return true
    } catch (error) {
      console.error("Error deleting session by token:", error)
      return false
    }
  }

  async createClient(data: {
    tenantId: string
    companyName: string
    contactEmail: string
    status?: ClientStatus
    createdById?: string
  }): Promise<Client | null> {
    try {
      return await companyDb.client.create({
        data: {
          tenantId: data.tenantId,
          companyName: data.companyName,
          contactEmail: data.contactEmail,
          status: data.status || "TRIAL",
          createdById: data.createdById,
        },
        include: {
          createdBy: true,
          updatedBy: true,
        },
      })
    } catch (error) {
      console.error("Error creating client:", error)
      return null
    }
  }

  async getClientById(id: string): Promise<Client | null> {
    try {
      return await companyDb.client.findUnique({
        where: { id },
        include: {
          createdBy: true,
          updatedBy: true,
        },
      })
    } catch (error) {
      console.error("Error fetching client:", error)
      return null
    }
  }

  async getClientByTenantId(tenantId: string): Promise<Client | null> {
    try {
      return await companyDb.client.findUnique({
        where: { tenantId },
        include: {
          createdBy: true,
          updatedBy: true,
        },
      })
    } catch (error) {
      console.error("Error fetching client by tenant ID:", error)
      return null
    }
  }

  async updateClient(
    id: string,
    data: Partial<Pick<Client, "companyName" | "contactEmail" | "status">> & {
      updatedById?: string
    },
  ): Promise<Client | null> {
    try {
      return await companyDb.client.update({
        where: { id },
        data,
        include: {
          createdBy: true,
          updatedBy: true,
        },
      })
    } catch (error) {
      console.error("Error updating client:", error)
      return null
    }
  }

  async listClients(params?: { status?: ClientStatus; limit?: number; offset?: number }): Promise<Client[]> {
    try {
      return await companyDb.client.findMany({
        where: params?.status ? { status: params.status } : undefined,
        take: params?.limit,
        skip: params?.offset,
        include: {
          createdBy: true,
          updatedBy: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    } catch (error) {
      console.error("Error listing clients:", error)
      return []
    }
  }
}

export const companyService = new CompanyService()
