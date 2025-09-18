import type { PrismaClient } from "@omni/admin-client"
import type { FastifyReply, FastifyRequest } from "@repo/server-core"
import type { CreateUser, UpdateUser, User } from "@repo/shared-types-and-schemas"

export class UserController {
  constructor(private prisma: PrismaClient) {}

  async getUsers(_request: FastifyRequest, reply: FastifyReply): Promise<Omit<User, "password">[] | { error: string }> {
    try {
      const users = await this.prisma.user.findMany({
        omit: {
          password: true,
        },
        orderBy: { createdAt: "desc" },
      })

      return reply.send(users)
    } catch (error) {
      _request.log.error(error)
      return reply.status(500).send({ error: "Internal server error" })
    }
  }

  async getUserById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<Omit<User, "password"> | { error: string }> {
    try {
      const { id } = request.params

      const user = await this.prisma.user.findUnique({
        where: { id },
        omit: {
          password: true,
        },
      })

      if (!user) {
        return reply.status(404).send({ error: "User not found" })
      }

      return reply.send(user)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: "Internal server error" })
    }
  }

  async createUser(
    request: FastifyRequest<{ Body: CreateUser }>,
    reply: FastifyReply,
  ): Promise<Omit<User, "password"> | { error: string }> {
    try {
      const { email, name, password, role, status = "ACTIVE" } = request.body

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return reply.status(400).send({ error: "Email already exists" })
      }

      const user = await this.prisma.user.create({
        data: {
          email,
          name,
          password,
          role,
          status,
        },
        omit: {
          password: true,
        },
      })

      return reply.status(201).send(user)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: "Internal server error" })
    }
  }

  async updateUser(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateUser }>,
    reply: FastifyReply,
  ): Promise<Omit<User, "password"> | { error: string }> {
    try {
      const { id } = request.params
      const updateData = request.body

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({ error: "No update data provided" })
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      })

      if (!existingUser) {
        return reply.status(404).send({ error: "User not found" })
      }

      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: updateData.email },
        })

        if (emailExists) {
          return reply.status(400).send({ error: "Email already exists" })
        }
      }

      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
        omit: {
          password: true,
        },
      })

      return reply.send(user)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: "Internal server error" })
    }
  }

  async deleteUser(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<{ message: string } | { error: string }> {
    try {
      const { id } = request.params

      const user = await this.prisma.user.findUnique({
        where: { id },
      })

      if (!user) {
        return reply.status(404).send({ error: "User not found" })
      }

      await this.prisma.user.delete({
        where: { id },
      })

      return reply.send({ message: "User deleted successfully" })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: "Internal server error" })
    }
  }
}
