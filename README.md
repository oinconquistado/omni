# Omni SaaS - Inventory Management Platform

A modern multi-tenant SaaS platform for inventory management built with cutting-edge technologies and designed for scalability, performance, and maintainability.

## What is Omni?

Omni is a **Software-as-a-Service (SaaS) inventory management system** that helps businesses efficiently manage their stock, products, categories, and sales operations. The platform serves multiple client companies through a secure multi-tenant architecture with complete data isolation.

### Key Features

- **Multi-tenant Architecture**: Complete data isolation between client companies
- **Real-time Inventory Management**: Live stock tracking with quantity management
- **Product Catalog**: Comprehensive product management with SKU, pricing, and categorization
- **Role-based Access Control**: Granular permissions for different user types
- **Category Management**: Organize products into hierarchical categories
- **Stock Level Monitoring**: Automated reorder alerts and stock optimization

### Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Fastify with TypeScript, Swagger/OpenAPI
- **Database**: PostgreSQL with Prisma ORM (multi-database setup)
- **Caching**: Redis for performance optimization
- **Development**: Turborepo monorepo, pnpm, Biome.js
- **Documentation**: Fumadocs for comprehensive dev docs

## Applications

This monorepo includes four main applications:

- **omni-client** (port 3000) - Client-facing inventory management interface
- **omni-admin** (port 3001) - Administrative panel for Omni staff
- **omni-server** (port 3002) - Fastify API server with multi-tenant support
- **devdocs** (port 3003) - Development documentation with Fumadocs

## Shared Packages

- `@repo/shared-types`: Common TypeScript interfaces and API response types
- `@repo/typescript-config`: Shared TypeScript configurations for consistency

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (two separate databases)
- Redis instance

### Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd omni
pnpm install

# Setup environment variables
cp .env.example .env
# Configure your database URLs and Redis connection in .env

# Setup databases
cd apps/omni-server
npx prisma migrate dev        # Company database
npx prisma migrate dev --schema=prisma/shared-schema.prisma  # Shared database
npx prisma generate           # Generate Prisma clients
```

### Development

```bash
# Start all applications
pnpm dev

# Or start individual/paired applications
pnpm dev:client              # Client app only (port 3000)
pnpm dev:admin               # Admin app only (port 3001) 
pnpm dev:server              # API server only (port 3002)
pnpm dev:devdocs             # Documentation only (port 3003)

pnpm dev:client-server       # Client + API
pnpm dev:admin-server        # Admin + API
pnpm dev:devdocs-server      # Documentation + API
```

### Building

```bash
# Build all applications
pnpm build

# Build individual applications
pnpm build:client
pnpm build:admin
pnpm build:server
pnpm build:devdocs
```

### Code Quality

```bash
# Lint and format code
pnpm lint                    # Check code with Biome.js
pnpm format                  # Format code with Biome.js
pnpm check-types            # TypeScript type checking
pnpm check                  # Run all quality checks
```

## Documentation

For comprehensive development documentation, API references, and database schema details, visit the development documentation at `http://localhost:3003` when running the devdocs application.

## Architecture

Omni uses a **Shared Schema** multi-tenant approach with:

- **Company Database**: Internal Omni operations, staff users, and client management
- **Shared Database**: Multi-tenant client data with complete tenant isolation
- **Service Layer**: Abstracted business logic with dedicated services for each database
- **API Layer**: RESTful APIs with Swagger/OpenAPI documentation
- **Frontend Apps**: Separate interfaces for clients and administrators

## Contributing

1. Follow the established code style using Biome.js
2. Ensure TypeScript type safety across all packages
3. Update documentation for any architectural changes
4. Test your changes across all affected applications
