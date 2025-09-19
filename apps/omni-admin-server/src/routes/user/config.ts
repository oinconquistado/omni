import type { ModuleConfig } from "@repo/server-core"
import { createUserSchema, updateUserSchema, userParamsSchema } from "@repo/shared-types-and-schemas"

export const config: ModuleConfig = {
  routes: {
    users: {
      method: "GET",
      controller: "get-users-controller",
    },
    "users/:id": {
      method: "GET",
      controller: "get-user-controller",
      validation: {
        params: userParamsSchema,
      },
    },
    create: {
      method: "POST",
      controller: "create-user-controller",
      validation: {
        body: createUserSchema,
      },
    },
    "update/:id": {
      method: "PUT",
      controller: "update-user-controller",
      validation: {
        params: userParamsSchema,
        body: updateUserSchema,
      },
    },
    "delete/:id": {
      method: "DELETE",
      controller: "delete-user-controller",
      validation: {
        params: userParamsSchema,
      },
    },
  },
}

export default config
