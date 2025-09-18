import type { ControllerHandler } from "@repo/server-core"
import type { UpdateUser } from "@repo/shared-types-and-schemas"

export const handle: ControllerHandler<UpdateUser & { id: string }> = async (input, context) => {
  const { id, ...updateData } = input

  if (Object.keys(updateData).length === 0) {
    throw new Error("No update data provided")
  }

  const existingUser = await context.db.user.findUnique({
    where: { id },
  })

  if (!existingUser) {
    throw new Error("User not found")
  }

  if (updateData.email && updateData.email !== existingUser.email) {
    const emailExists = await context.db.user.findUnique({
      where: { email: updateData.email },
    })

    if (emailExists) {
      throw new Error("Email already exists")
    }
  }

  const user = await context.db.user.update({
    where: { id },
    data: updateData,
    omit: {
      password: true,
    },
  })

  return user
}
