import type { PrismaClient } from "@omni/admin-client"
import type { FastifyInstance, RouteRegistrator } from "@repo/server-core"
import { createValidationMiddleware } from "@repo/server-core"
import type { UserLogin, UserLoginResponse } from "@repo/shared-types-and-schemas"
import { userLoginSchema } from "@repo/shared-types-and-schemas"

import { AuthController } from "@/controllers/auth"

export function createAuthRoutes(prisma: PrismaClient): RouteRegistrator {
  return async (fastify: FastifyInstance) => {
    const authController = new AuthController(prisma)

    const validateLogin = createValidationMiddleware({
      schemas: { body: userLoginSchema },
    })

    // POST /auth/login
    fastify.post<{
      Body: UserLogin
      Reply: UserLoginResponse | { error: string }
    }>(
      "/auth/login",
      {
        schema: {
          body: {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string" },
            },
            required: ["email", "password"],
          },
          response: {
            200: {
              type: "object",
              properties: {
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    email: { type: "string" },
                    name: { type: "string" },
                    role: { type: "string" },
                    status: { type: "string" },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" },
                  },
                },
              },
            },
            401: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
          },
        },
        preHandler: validateLogin,
      },
      authController.login.bind(authController),
    )

    // POST /auth/logout
    fastify.post(
      "/auth/logout",
      {
        schema: {
          response: {
            200: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
            },
          },
        },
      },
      authController.logout.bind(authController),
    )
  }
}
