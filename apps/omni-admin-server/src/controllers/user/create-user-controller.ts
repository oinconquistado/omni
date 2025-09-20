import type { ControllerHandler } from "@repo/server-core"
import type { CreateUser } from "@repo/shared-types-and-schemas"

export const handle: ControllerHandler<CreateUser> = async (input, context) => {
  const { email, name, password, role, status = "ACTIVE" } = input

  const db = context.db as unknown as {
    user: {
      findUnique: (args: unknown) => Promise<unknown>
      create: (args: unknown) => Promise<unknown>
    }
  }

  const existingUser = await db.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new Error("Email already exists")
  }

  const user = await db.user.create({
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
