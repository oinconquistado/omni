import type { ControllerHandler } from "@repo/server-core"

export const handle: ControllerHandler = async () => {
  return {
    message: "Logout successful",
  }
}
