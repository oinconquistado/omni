import type { ControllerHandler } from "@repo/server-core"
import type { UserLogin } from "@repo/shared-types-and-schemas"

export const handle: ControllerHandler<UserLogin> = async (input, context) => {
  const { email, password } = input

  const user = await context.db.user.findUnique({
    where: { email },
  })

  if (!user || user.password !== password) {
    throw new Error("Invalid credentials")
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Account inactive")
  }

  const { password: _, ...userWithoutPassword } = user

  return {
    user: userWithoutPassword,
  }
}
