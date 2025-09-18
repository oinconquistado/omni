import type { ControllerHandler } from "@repo/server-core"

export const handle: ControllerHandler = async (_input, context) => {
  const users = await context.db.user.findMany({
    omit: {
      password: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return users
}
