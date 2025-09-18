import type { ModuleConfig } from "@repo/server-core"
import { userLoginSchema } from "@repo/shared-types-and-schemas"

export const config: ModuleConfig = {
  routes: {
    login: {
      method: "POST",
      controller: "login-controller",
      validation: {
        body: userLoginSchema,
      },
    },
    logout: {
      method: "POST",
      controller: "logout-controller",
    },
  },
}
