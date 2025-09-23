import type { ControllerHandler } from "@repo/server-core"

export const handle: ControllerHandler = async (_input, context) => {
  const db = context.db as unknown as {
    user: {
      findMany: (args: unknown) => Promise<unknown>
    }
  }

  const users = await db.user.findMany({
    omit: {
      password: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return users
}
