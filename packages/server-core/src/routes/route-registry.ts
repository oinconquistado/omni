import type { FastifyInstance } from "../types/fastify-types"

export type RouteRegistrator = (fastify: FastifyInstance) => Promise<void>

export async function registerRoutes(fastify: FastifyInstance, routes: RouteRegistrator[]): Promise<void> {
  await Promise.all(routes.map((registerRoute) => registerRoute(fastify)))
}
