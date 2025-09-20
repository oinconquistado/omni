import type { ControllerHandler } from "@repo/server-core"

export const handle: ControllerHandler = async (input, context) => {
  const { id } = input as { id: string }

  const db = context.db as unknown as {
    user: {
      findUnique: (args: unknown) => Promise<unknown>
      delete: (args: unknown) => Promise<unknown>
    }
  }

  const user = await db.user.findUnique({
    where: { id },
  })

  if (!user) {
    throw new Error("User not found")
  }

  await db.user.delete({
    where: { id },
  })

  return {
    message: "User deleted successfully",
  }
}
