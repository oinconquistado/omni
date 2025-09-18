import type { ControllerHandler } from "@repo/server-core"
import type { CreateUser } from "@repo/shared-types-and-schemas"

export const handle: ControllerHandler<CreateUser> = async (input, context) => {
  const { email, name, password, role, status = "ACTIVE" } = input

  const existingUser = await context.db.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new Error("Email already exists")
  }

  const user = await context.db.user.create({
    data: {
      email,
      name,
      password,
      role,
      status,
    },
    omit: {
      password: true,
    },
  })

  return user
}
