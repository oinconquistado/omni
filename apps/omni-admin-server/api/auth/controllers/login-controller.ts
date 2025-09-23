import type { ControllerHandler } from "@repo/server-core"
import type { UserLogin } from "@repo/shared-types-and-schemas"

export const handle: ControllerHandler<UserLogin> = async (input, context) => {
  const { email, password } = input

  const db = context.db as unknown as {
    user: {
      findUnique: (args: unknown) => Promise<unknown>
    }
  }

  const user = await db.user.findUnique({
    where: { email },
  })

  if (!user || (user as { password: string }).password !== password) {
    throw new Error("Invalid credentials")
  }

  if ((user as { status: string }).status !== "ACTIVE") {
    throw new Error("Account inactive")
  }

  const { password: _, ...userWithoutPassword } = user as { password: string; [key: string]: unknown }

  return {
    user: userWithoutPassword,
  }
}
