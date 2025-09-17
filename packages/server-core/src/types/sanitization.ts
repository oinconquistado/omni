export type MaskType = "cpf" | "cnpj" | "phone" | "email" | "credit-card" | "custom"

export interface MaskConfig {
  type: MaskType
  pattern?: string
  replacement?: string
}

export interface SanitizationRule {
  field: string
  action: "exclude" | "mask" | "transform"
  mask?: MaskConfig
  transformer?: (value: unknown) => unknown
}

export interface SanitizationConfig {
  rules: SanitizationRule[]
  applyToNested?: boolean
  preserveArrayStructure?: boolean
}

export interface SanitizationContext {
  userRole?: string
  requestPath?: string
  method?: string
  customContext?: Record<string, unknown>
}
