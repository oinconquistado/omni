// Example of how to use Zod validation with server-core

import { z } from "zod"
import type { ControllerContext } from "../types/declarative-routes"

// import type { ModuleConfig } from "@repo/server-core"

// Define your schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
})

const userParamsSchema = z.object({
  id: z.string().uuid("Invalid user ID format"),
})

const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 1))
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 10))
    .pipe(z.number().min(1).max(100)),
  search: z.string().optional(),
})

// Use in your route configuration
export const config = {
  routes: {
    // POST /auth/login - Login with email and password
    login: {
      method: "POST",
      controller: "login-controller",
      validation: {
        body: loginSchema,
      },
    },

    // GET /auth/me - Get current user (requires authentication)
    me: {
      method: "GET",
      controller: "me-controller",
      authorization: {
        requireAuth: true,
      },
    },

    // GET /users/:id - Get user by ID
    getUser: {
      method: "GET",
      controller: "get-user-controller",
      validation: {
        params: userParamsSchema,
      },
      authorization: {
        requireAuth: true,
        roles: ["ADMIN"],
      },
    },

    // GET /users - List users with pagination
    listUsers: {
      method: "GET",
      controller: "list-users-controller",
      validation: {
        query: paginationQuerySchema,
      },
      authorization: {
        requireAuth: true,
        roles: ["ADMIN"],
      },
      paginated: true,
    },
  },
}

// Example controller with typed input
// import type { ControllerHandler } from "@repo/server-core"

type LoginInput = z.infer<typeof loginSchema>

export const handle = async (input: LoginInput, { db, log }: ControllerContext) => {
  log.info({ email: input.email }, "User attempting to login")

  // The input is already validated by the middleware
  // input.email is guaranteed to be a valid email
  // input.password is guaranteed to be a non-empty string

  const user = await (db as any).user.findUnique({
    where: { email: input.email },
  })

  if (!user) {
    throw new Error("Invalid credentials")
  }

  // Your login logic here...

  return {
    token: "jwt-token-here",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  }
}

/*
Validation Features:

1. **Automatic Validation**: The server-core automatically validates incoming requests
   against your Zod schemas before calling your controller.

2. **Type Safety**: Controllers receive properly typed input based on the schemas.

3. **Error Handling**: Validation errors are automatically formatted and returned
   using the response orchestrator.

4. **Swagger Integration**: Schemas are automatically converted to OpenAPI/Swagger
   documentation.

5. **Request Transformation**: Zod transformations (like string to number) are
   applied automatically.

Example validation errors response:
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "validationErrors": {
        "body": [
          "email: Invalid email format",
          "password: Password is required"
        ]
      }
    }
  }
}
*/
