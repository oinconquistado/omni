import type { PrismaClient } from "@omni/admin-client"
import type { FastifyInstance, RouteRegistrator } from "@repo/server-core"
import { createValidationMiddleware } from "@repo/server-core"
import type { CreateUser, UpdateUser, User, UserLogin, UserLoginResponse } from "@repo/shared-types-and-schemas"
import { createUserSchema, updateUserSchema, userLoginSchema, userParamsSchema } from "@repo/shared-types-and-schemas"

export function createUserRoutes(prisma: PrismaClient): RouteRegistrator {
  return async (fastify: FastifyInstance) => {
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
      async (request, reply) => {
        try {
          const { email, password } = request.body

          const user = await prisma.user.findUnique({
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
      },
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
      async (_request, reply) => {
        return reply.send({ message: "Logout successful" })
      },
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
      async (_request, reply) => {
        try {
          const users = await prisma.user.findMany({
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
          })

          return reply.send(users)
        } catch (error) {
          _request.log.error(error)
          return reply.status(500).send({ error: "Internal server error" })
        }
      },
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
      async (request, reply) => {
        try {
          const { id } = request.params

          const user = await prisma.user.findUnique({
            where: { id },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
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
      },
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
      async (request, reply) => {
        try {
          const { email, name, password, role, status = "ACTIVE" } = request.body

          const existingUser = await prisma.user.findUnique({
            where: { email },
          })

          if (existingUser) {
            return reply.status(400).send({ error: "Email already exists" })
          }

          const user = await prisma.user.create({
            data: {
              email,
              name,
              password,
              role,
              status,
            },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          })

          return reply.status(201).send(user)
        } catch (error) {
          request.log.error(error)
          return reply.status(500).send({ error: "Internal server error" })
        }
      },
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
      async (request, reply) => {
        try {
          const { id } = request.params
          const updateData = request.body

          if (Object.keys(updateData).length === 0) {
            return reply.status(400).send({ error: "No update data provided" })
          }

          const existingUser = await prisma.user.findUnique({
            where: { id },
          })

          if (!existingUser) {
            return reply.status(404).send({ error: "User not found" })
          }

          if (updateData.email && updateData.email !== existingUser.email) {
            const emailExists = await prisma.user.findUnique({
              where: { email: updateData.email },
            })

            if (emailExists) {
              return reply.status(400).send({ error: "Email already exists" })
            }
          }

          const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          })

          return reply.send(user)
        } catch (error) {
          request.log.error(error)
          return reply.status(500).send({ error: "Internal server error" })
        }
      },
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
      async (request, reply) => {
        try {
          const { id } = request.params

          const user = await prisma.user.findUnique({
            where: { id },
          })

          if (!user) {
            return reply.status(404).send({ error: "User not found" })
          }

          await prisma.user.delete({
            where: { id },
          })

          return reply.send({ message: "User deleted successfully" })
        } catch (error) {
          request.log.error(error)
          return reply.status(500).send({ error: "Internal server error" })
        }
      },
    )
  }
}
