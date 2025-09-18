import type { PrismaClient } from "@omni/admin-client"
import type { FastifyInstance, RouteRegistrator } from "@repo/server-core"
import { createValidationMiddleware } from "@repo/server-core"
import type { CreateUser, UpdateUser, User, UserLogin, UserLoginResponse } from "@repo/shared-types-and-schemas"
import { createUserSchema, updateUserSchema, userLoginSchema, userParamsSchema } from "@repo/shared-types-and-schemas"

import { AuthController } from "@/controllers/auth-controller.js"
import { UserController } from "@/controllers/user-controller.js"

export function createUserRoutes(prisma: PrismaClient): RouteRegistrator {
  return async (fastify: FastifyInstance) => {
    const authController = new AuthController(prisma)
    const userController = new UserController(prisma)

    const validateLogin = createValidationMiddleware({
      schemas: { body: userLoginSchema },
    })

    const validateCreateUser = createValidationMiddleware({
      schemas: { body: createUserSchema },
    })

    const validateUpdateUser = createValidationMiddleware({
      schemas: { body: updateUserSchema },
    })

    const validateParams = createValidationMiddleware({
      schemas: { params: userParamsSchema },
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

    // GET /users
    fastify.get<{
      Reply: Omit<User, "password">[] | { error: string }
    }>(
      "/users",
      {
        schema: {
          response: {
            200: {
              type: "array",
              items: {
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
        },
      },
      userController.getUsers.bind(userController),
    )

    // GET /users/:id
    fastify.get<{
      Params: { id: string }
      Reply: Omit<User, "password"> | { error: string }
    }>(
      "/users/:id",
      {
        schema: {
          params: {
            type: "object",
            properties: {
              id: { type: "string" },
            },
            required: ["id"],
          },
          response: {
            200: {
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
            404: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
          },
        },
        preHandler: [validateParams],
      },
      userController.getUserById.bind(userController),
    )

    // POST /users
    fastify.post<{
      Body: CreateUser
      Reply: Omit<User, "password"> | { error: string }
    }>(
      "/users",
      {
        schema: {
          body: {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              name: { type: "string" },
              password: { type: "string", minLength: 6 },
              role: { type: "string", enum: ["ADMIN", "SUPPORT"] },
              status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"] },
            },
            required: ["email", "name", "password", "role"],
          },
          response: {
            201: {
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
            400: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
          },
        },
        preHandler: validateCreateUser,
      },
      userController.createUser.bind(userController),
    )

    // PUT /users/:id
    fastify.put<{
      Params: { id: string }
      Body: UpdateUser
      Reply: Omit<User, "password"> | { error: string }
    }>(
      "/users/:id",
      {
        schema: {
          params: {
            type: "object",
            properties: {
              id: { type: "string" },
            },
            required: ["id"],
          },
          body: {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              name: { type: "string" },
              password: { type: "string", minLength: 6 },
              role: { type: "string", enum: ["ADMIN", "SUPPORT"] },
              status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"] },
            },
          },
          response: {
            200: {
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
            400: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
            404: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
          },
        },
        preHandler: [validateParams, validateUpdateUser],
      },
      userController.updateUser.bind(userController),
    )

    // DELETE /users/:id
    fastify.delete<{
      Params: { id: string }
      Reply: { message: string } | { error: string }
    }>(
      "/users/:id",
      {
        schema: {
          params: {
            type: "object",
            properties: {
              id: { type: "string" },
            },
            required: ["id"],
          },
          response: {
            200: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
            },
            404: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
          },
        },
        preHandler: [validateParams],
      },
      userController.deleteUser.bind(userController),
    )
  }
}
