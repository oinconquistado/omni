import { useContext } from "react"
import { HttpClient } from "../client/http-client.js"
import { ApiClientContext } from "./api-client-provider.js"

export function useApiClient(): HttpClient {
  const context = useContext(ApiClientContext)

  if (!context) {
    throw new Error("useApiClient must be used within an ApiClientProvider")
  }

  return context.client
}

export function useApiClientConfig() {
  const context = useContext(ApiClientContext)

  if (!context) {
    throw new Error("useApiClientConfig must be used within an ApiClientProvider")
  }

  return {
    config: context.client.getConfig(),
    updateConfig: context.client.updateConfig.bind(context.client),
    metrics: context.client.getMetrics(),
    clearMetrics: context.client.clearMetrics.bind(context.client),
  }
}
