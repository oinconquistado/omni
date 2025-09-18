import type { ControllerHandler } from "@repo/server-core"

export const handle: ControllerHandler = async (input, context) => {
  const { id } = input

  const user = await context.db.user.findUnique({
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
