import { basename, join, resolve } from "node:path"
import { glob } from "glob"

// Regex patterns defined at module level for performance
const PATH_SEPARATOR_REGEX = /^[/\\]/
const PATH_SPLIT_REGEX = /[/\\]/

export interface SchemaMetadata {
  schemaName: string
  moduleName: string
  filePath: string
  validationType: "body" | "params" | "query" | "headers"
  schema: unknown
}

export interface SchemaDiscoveryOptions {
  apiPath: string
  log?: {
    debug?: (data: unknown, message?: string) => void
    info?: (data: unknown, message?: string) => void
    warn?: (data: unknown, message?: string) => void
    error?: (data: unknown, message?: string) => void
  }
}

export class SchemaDiscovery {
  private schemaCache = new WeakMap<object, SchemaMetadata>()
  private schemaByName = new Map<string, SchemaMetadata>()

  constructor(private options: SchemaDiscoveryOptions) {}

  async discoverSchemas(): Promise<Map<string, SchemaMetadata>> {
    const log = this.options.log
    log?.debug?.({ apiPath: this.options.apiPath }, "Starting schema discovery")

    let foundFiles = 0
    let successfullyProcessed = 0
    const failedProcessing: Array<{ file: string; error: Error }> = []

    try {
      // Find all *-schema.ts files
      const pattern = join(this.options.apiPath, "**/*-schema.{ts,js}").replace(/\\/g, "/")
      log?.debug?.({ pattern }, "Scanning for schema files")

      const schemaFiles = await glob(pattern, { absolute: true })
      foundFiles = schemaFiles.length
      log?.debug?.({ count: foundFiles }, "Found schema files")

      // Process schemas in parallel with chunks for better performance
      const chunkSize = 10
      const chunks = this.chunkArray(schemaFiles, chunkSize)

      const processedSchemas: SchemaMetadata[] = []

      // Process all chunks in parallel for better performance
      const chunkPromises = chunks.map((chunk) =>
        Promise.all(
          chunk.map(async (filePath: string) => {
            try {
              const result = await this.processSchemaFile(filePath)
              if (result) {
                successfullyProcessed++
                return result
              }
              return null
            } catch (error) {
              failedProcessing.push({ file: filePath, error: error as Error })
              return null
            }
          }),
        ),
      )

      const chunkResults = await Promise.all(chunkPromises)

      // Flatten results and filter out null values
      for (const chunkResult of chunkResults) {
        processedSchemas.push(...(chunkResult.filter(Boolean) as SchemaMetadata[]))
      }

      // Build cache
      this.buildSchemaCache(processedSchemas)

      log?.info?.(
        {
          processedFiles: `${successfullyProcessed}/${foundFiles}`,
        },
        `Schema discovery completed: ${successfullyProcessed}/${foundFiles} files processed successfully`,
      )
      
      if (failedProcessing.length > 0) {
        log?.warn?.(
          { failedCount: failedProcessing.length },
          `Failed to process ${failedProcessing.length} schema files`,
        )
        failedProcessing.forEach((failure) => {
          log?.error?.({ file: failure.file, error: failure.error.message }, `Failed to process schema file`)
        })
      }

      return this.schemaByName
    } catch (error) {
      log?.error?.({ error, apiPath: this.options.apiPath }, "Schema discovery failed")
      throw error
    }
  }

  private async processSchemaFile(filePath: string): Promise<SchemaMetadata | null> {
    // Extract metadata from file path
    const metadata = this.extractSchemaMetadata(filePath)
    if (!metadata) {
      this.options.log?.warn?.({ filePath }, "Could not extract schema metadata")
      return null
    }

    // Load schema module
    const schemaModule = await this.loadSchemaModule(filePath)
    if (!schemaModule?.default) {
      this.options.log?.warn?.({ filePath }, "Schema file does not export default schema")
      return null
    }

    const result: SchemaMetadata = {
      ...metadata,
      schema: schemaModule.default,
    }

    return result
  }

  private extractSchemaMetadata(filePath: string): Omit<SchemaMetadata, "schema"> | null {
    try {
      // Get relative path from api directory
      const relativePath = filePath.replace(this.options.apiPath, "").replace(PATH_SEPARATOR_REGEX, "")

      // Extract parts: {module}/schemas/{schema-name}-schema.{ext}
      const parts = relativePath.split(PATH_SPLIT_REGEX)
      if (parts.length < 3 || !parts[2]) return null

      const moduleName = parts[0]
      if (!moduleName || parts[1] !== "schemas") return null

      const fileName = basename(parts[2], ".ts").replace(".js", "")
      if (!fileName.endsWith("-schema")) return null

      const schemaName = fileName.replace("-schema", "")

      // Determine validation type based on schema name
      const validationType = this.inferValidationType(schemaName)

      return {
        schemaName,
        moduleName,
        filePath,
        validationType,
      }
    } catch (error) {
      this.options.log?.error?.({ error, filePath }, "Failed to extract schema metadata")
      return null
    }
  }

  private inferValidationType(schemaName: string): "body" | "params" | "query" | "headers" {
    // Infer validation type from schema name patterns
    if (schemaName.includes("params") || schemaName.includes("param")) {
      return "params"
    }
    if (schemaName.includes("query")) {
      return "query"
    }
    if (schemaName.includes("header")) {
      return "headers"
    }
    // Default to body validation
    return "body"
  }

  private async loadSchemaModule(filePath: string): Promise<{ default?: unknown } | null> {
    try {
      // Add cache busting for development
      const cacheBuster = `?t=${Date.now()}`
      const resolvedPath = resolve(filePath)

      const module = await import(resolvedPath + cacheBuster)
      return module
    } catch (error) {
      this.options.log?.error?.({ error, filePath }, "Failed to load schema module")
      return null
    }
  }

  private buildSchemaCache(schemas: SchemaMetadata[]): void {
    this.schemaByName.clear()

    for (const schema of schemas) {
      const key = `${schema.moduleName}/${schema.schemaName}`
      this.schemaByName.set(key, schema)

      // Use WeakMap for object-based caching if schema is an object
      if (typeof schema.schema === "object" && schema.schema !== null) {
        this.schemaCache.set(schema.schema as object, schema)
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  getSchema(moduleName: string, schemaName: string): SchemaMetadata | undefined {
    return this.schemaByName.get(`${moduleName}/${schemaName}`)
  }

  getSchemasByModule(moduleName: string): SchemaMetadata[] {
    return Array.from(this.schemaByName.values()).filter((schema) => schema.moduleName === moduleName)
  }

  getAllSchemas(): SchemaMetadata[] {
    return Array.from(this.schemaByName.values())
  }
}
