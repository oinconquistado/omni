import { basename, join, resolve } from "node:path"
import { glob } from "glob"

// Regex patterns defined at module level for performance
const PATH_SEPARATOR_REGEX = /^[/\\]/
const PATH_SPLIT_REGEX = /[/\\]/

export interface ControllerMetadata {
  controllerName: string
  moduleName: string
  filePath: string
  routePath: string
  handler: (...args: unknown[]) => unknown
}

export interface ControllerDiscoveryOptions {
  apiPath: string
  log?: {
    debug?: (data: unknown, message?: string) => void
    info?: (data: unknown, message?: string) => void
    warn?: (data: unknown, message?: string) => void
    error?: (data: unknown, message?: string) => void
  }
}

export class ControllerDiscovery {
  private controllerCache = new Map<string, ControllerMetadata>()
  private duplicateRoutes = new Set<string>()

  constructor(private options: ControllerDiscoveryOptions) {}

  async discoverControllers(): Promise<Map<string, ControllerMetadata>> {
    const log = this.options.log
    log?.debug?.({ apiPath: this.options.apiPath }, "Starting controller discovery")

    try {
      // Find all *-controller.ts files
      const pattern = join(this.options.apiPath, "**/*-controller.{ts,js}").replace(/\\/g, "/")
      log?.debug?.({ pattern }, "Scanning for controller files")

      const controllerFiles = await glob(pattern, { absolute: true })
      log?.debug?.({ count: controllerFiles.length, files: controllerFiles }, "Found controller files")

      // Process controllers in parallel with chunks for better performance
      const chunkSize = 10
      const chunks = this.chunkArray(controllerFiles, chunkSize)

      const processedControllers: ControllerMetadata[] = []

      // Process all chunks in parallel for better performance
      const chunkPromises = chunks.map((chunk) =>
        Promise.all(chunk.map((filePath: string) => this.processControllerFile(filePath))),
      )

      const chunkResults = await Promise.all(chunkPromises)

      // Flatten results and filter out null values
      for (const chunkResult of chunkResults) {
        processedControllers.push(...(chunkResult.filter(Boolean) as ControllerMetadata[]))
      }

      // Build cache and detect duplicates
      this.buildControllerCache(processedControllers)

      log?.info?.(
        {
          totalControllers: processedControllers.length,
          duplicateRoutes: Array.from(this.duplicateRoutes),
        },
        "Controller discovery completed",
      )

      return this.controllerCache
    } catch (error) {
      log?.error?.({ error, apiPath: this.options.apiPath }, "Controller discovery failed")
      throw error
    }
  }

  private async processControllerFile(filePath: string): Promise<ControllerMetadata | null> {
    const log = this.options.log

    try {
      log?.debug?.({ filePath }, "Processing controller file")

      // Extract metadata from file path
      const metadata = this.extractControllerMetadata(filePath)
      if (!metadata) {
        log?.warn?.({ filePath }, "Could not extract controller metadata")
        return null
      }

      // Load controller module
      const controllerModule = await this.loadControllerModule(filePath)
      if (!controllerModule?.handle) {
        log?.warn?.({ filePath }, "Controller file does not export 'handle' function")
        return null
      }

      const result: ControllerMetadata = {
        ...metadata,
        handler: controllerModule.handle as (...args: unknown[]) => unknown,
      }

      log?.debug?.({ controller: result }, "Successfully processed controller")
      return result
    } catch (error) {
      log?.error?.({ error, filePath }, "Failed to process controller file")
      return null
    }
  }

  private extractControllerMetadata(filePath: string): Omit<ControllerMetadata, "handler"> | null {
    try {
      // Get relative path from api directory
      const relativePath = filePath.replace(this.options.apiPath, "").replace(PATH_SEPARATOR_REGEX, "")

      // Extract parts: {module}/controllers/{controller-name}-controller.{ext}
      const parts = relativePath.split(PATH_SPLIT_REGEX)
      if (parts.length < 3 || !parts[2]) return null

      const moduleName = parts[0]
      if (!moduleName || parts[1] !== "controllers") return null

      const fileName = basename(parts[2], ".ts").replace(".js", "")
      if (!fileName.endsWith("-controller")) return null

      const controllerName = fileName.replace("-controller", "")
      const routePath = `/${moduleName}/${controllerName}`

      return {
        controllerName,
        moduleName,
        filePath,
        routePath,
      }
    } catch (error) {
      this.options.log?.error?.({ error, filePath }, "Failed to extract controller metadata")
      return null
    }
  }

  private async loadControllerModule(filePath: string): Promise<{ handle?: (...args: unknown[]) => unknown } | null> {
    try {
      // Add cache busting for development
      const cacheBuster = `?t=${Date.now()}`
      const resolvedPath = resolve(filePath)

      const module = await import(resolvedPath + cacheBuster)
      return module
    } catch (error) {
      this.options.log?.error?.({ error, filePath }, "Failed to load controller module")
      return null
    }
  }

  private buildControllerCache(controllers: ControllerMetadata[]): void {
    this.controllerCache.clear()
    this.duplicateRoutes.clear()

    const routeMap = new Map<string, ControllerMetadata[]>()

    // Group controllers by route path
    for (const controller of controllers) {
      const existing = routeMap.get(controller.routePath) || []
      existing.push(controller)
      routeMap.set(controller.routePath, existing)
    }

    // Process each route group
    for (const [routePath, controllers] of routeMap) {
      if (controllers.length > 1) {
        this.duplicateRoutes.add(routePath)
        this.options.log?.warn?.(
          {
            routePath,
            controllers: controllers.map((c) => c.filePath),
          },
          "Duplicate route detected - using first controller found",
        )
      }

      // Use first controller (priority could be implemented here)
      const firstController = controllers[0]
      if (firstController) {
        this.controllerCache.set(routePath, firstController)
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

  getController(routePath: string): ControllerMetadata | undefined {
    return this.controllerCache.get(routePath)
  }

  getAllControllers(): ControllerMetadata[] {
    return Array.from(this.controllerCache.values())
  }

  getDuplicateRoutes(): string[] {
    return Array.from(this.duplicateRoutes)
  }
}
