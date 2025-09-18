import type { PrismaClient } from "@omni/admin-client"
import type { FastifyReply, FastifyRequest } from "@repo/server-core"
import type { UserLogin, UserLoginResponse } from "@repo/shared-types-and-schemas"

export class AuthController {
  constructor(private prisma: PrismaClient) {}

  async login(
    request: FastifyRequest<{ Body: UserLogin }>,
    reply: FastifyReply,
  ): Promise<UserLoginResponse | { error: string }> {
    try {
      const { email, password } = request.body

      const user = await this.prisma.user.findUnique({
        where: { email },
      })

      if (!user || user.password !== password) {
        return reply.status(401).send({ error: "Invalid credentials" })
      }

      if (user.status !== "ACTIVE") {
        return reply.status(401).send({ error: "Account inactive" })
      }

      const { password: _, ...userWithoutPassword } = user

      return reply.send({
        user: userWithoutPassword,
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: "Internal server error" })
    }
  }

  async logout(_request: FastifyRequest, reply: FastifyReply): Promise<{ message: string }> {
    return reply.send({ message: "Logout successful" })
  }
}
