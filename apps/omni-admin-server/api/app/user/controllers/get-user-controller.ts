import type { ControllerHandler } from "@repo/server-core"

export const handle: ControllerHandler = async (input, context) => {
  const { id } = input as { id: string }

  const db = context.db as unknown as {
    user: {
      findUnique: (args: unknown) => Promise<unknown>
    }
  }

  const user = await db.user.findUnique({
    where: { id },
    omit: {
      password: true,
    },
  })

  if (!user) {
    throw new Error("User not found")
  }

  return user
}
