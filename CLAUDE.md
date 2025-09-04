# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Turborepo monorepo with TypeScript, Next.js apps, and a Fastify server. It uses pnpm as the package manager and Biome.js for linting and formatting. It includes:

- **Apps**: 
  - `omni-client` (port 3000) - Next.js client application
  - `omni-admin` (port 3001) - Next.js admin panel
  - `omni-server` (port 3002) - Fastify API server
- **Packages**: `@repo/shared-types` (contains `ApiResponse<T>` interface), `@repo/typescript-config` (TypeScript configs)
- **Architecture**: Monorepo with workspace dependencies using `workspace:*` protocol

## Common Commands

### Development
```bash
# Start all apps in development mode
pnpm dev

# Start individual apps
pnpm dev:client    # Start omni-client on port 3000
pnpm dev:admin     # Start omni-admin on port 3001
pnpm dev:server    # Start omni-server on port 3002

# Start combinations
pnpm dev:client-server  # Start client + server
pnpm dev:admin-server   # Start admin + server

# Work with shared types package
pnpm --filter=@repo/shared-types check-types
```

### Building
```bash
# Build all apps and packages
pnpm build

# Build individual apps
pnpm build:client   # Build omni-client
pnpm build:admin    # Build omni-admin
pnpm build:server   # Build omni-server

# Build specific package/app with filters
pnpm build --filter=omni-client
pnpm build --filter=omni-admin
pnpm build --filter=omni-server
```

### Linting, Formatting and Type Checking
```bash
# Lint all packages with Biome.js
pnpm lint

# Format all code with Biome.js
pnpm format

# Type check all packages
pnpm check-types

# Run Biome.js directly
biome lint .
biome format --write .
biome check .
```

## Architecture Details

### Shared Packages Structure
- **@repo/shared-types**: Contains `ApiResponse<T>` interface for consistent API responses across all apps
- **@repo/typescript-config**: Offers base.json, nextjs.json, and react-library.json configurations
- **Biome.js**: Centralized configuration in `biome.json` for linting and formatting across all packages

### Turborepo Configuration
- Build tasks have dependency ordering with `"dependsOn": ["^build"]`
- Development mode disables caching with `"cache": false, "persistent": true`
- Lint and type-check tasks respect dependency order
- Uses TUI interface (`"ui": "tui"`)

### Package Dependencies
All apps and packages use:
- TypeScript 5.9.2
- React 19.1.0 
- Biome.js 2.2.2 for linting and formatting
- Shared workspace packages for consistent configurations

### Development Workflow
- **Client app** (omni-client): Port 3000 - Next.js with Turbopack
- **Admin app** (omni-admin): Port 3001 - Next.js with Turbopack  
- **Server app** (omni-server): Port 3002 - Fastify with tsx watch mode
- Biome.js handles linting and formatting with consistent rules
- Type checking with `tsc --noEmit`
- Configuration centralized in root `biome.json`

### App-Specific Notes
- **omni-client & omni-admin**: Clean Next.js 15 setup with App Router
- **omni-server**: Fastify server with TypeScript, tsx for development, builds to `dist/`
- All apps use shared `@repo/shared-types` for type safety and `@repo/typescript-config`