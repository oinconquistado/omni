export type MaskType =
  | "cpf"
  | "cnpj"
  | "rg"
  | "cnh"
  | "pis"
  | "phone-landline"
  | "phone-mobile"
  | "cep"
  | "email"
  | "birth-date"
  | "state-registration"
  | "municipal-registration"
  | "sus-card"
  | "vehicle-plate"
  | "vehicle-chassis"
  | "ctps"
  | "credit-card"
  | "custom"

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
