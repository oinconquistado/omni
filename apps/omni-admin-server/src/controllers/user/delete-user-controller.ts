import type { ControllerHandler } from "@repo/server-core"

export const handle: ControllerHandler = async (input, context) => {
  const { id } = input

  const user = await context.db.user.findUnique({
    where: { id },
  })

  if (!user) {
    throw new Error("User not found")
  }

  await context.db.user.delete({
    where: { id },
  })

  return {
    message: "User deleted successfully",
  }
}
