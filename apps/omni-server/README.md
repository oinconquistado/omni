# Omni Server

High-performance Fastify API server with Redis caching and PostgreSQL persistence.

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───►│    Redis    │───►│ PostgreSQL  │
│  Request    │    │   Cache     │    │ Database    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Cache-First Strategy:
1. **Redis Hit** → Return cached data immediately
2. **Cache Miss** → Query PostgreSQL → Cache result → Return data
3. **Write Operations** → Update PostgreSQL → Update/Invalidate cache

## Features

- ✅ **TypeScript** with strict type checking
- ✅ **Prisma ORM** with PostgreSQL
- ✅ **Redis** caching layer
- ✅ **Modular architecture** with kebab-case naming
- ✅ **Environment validation** with Zod
- ✅ **Error handling** with custom error types
- ✅ **Graceful shutdown** with proper cleanup
- ✅ **Health check** endpoint
- ✅ **Connection pooling** and retry logic

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 2. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Or run migrations (for production)
pnpm db:migrate
```

### 3. Configure Remote Services

Update your `.env` file with your remote service credentials:

**PostgreSQL Options:**
- **Supabase**: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
- **Railway**: `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway`
- **Neon**: `postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require`
- **PlanetScale**: `mysql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslaccept=strict`

**Redis Options:**
- **Railway**: `redis://default:[PASSWORD]@[HOST]:[PORT]`
- **Upstash**: `redis://:[PASSWORD]@[HOST]:[PORT]`
- **Redis Cloud**: `redis://:[PASSWORD]@[HOST]:[PORT]`

### 4. Start Development Server

```bash
# Generate Prisma client
pnpm --filter=omni-server db:generate

# Push database schema (for development)
pnpm --filter=omni-server db:push

# Start development server
pnpm --filter=omni-server dev
```

## Environment Variables

```env
# Database Configuration - Remote PostgreSQL
DATABASE_URL="postgresql://username:password@your-postgres-host:5432/database_name?schema=public&sslmode=require"

# Redis Configuration - Remote Redis
REDIS_URL="redis://your-redis-host:6379"
REDIS_PASSWORD="your-redis-password"
REDIS_DB=0

# Cache Configuration
CACHE_TTL=3600
CACHE_PREFIX="omni:"

# Server Configuration
PORT=3002
NODE_ENV="development"
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Users
- `GET /users/:id` - Get user by ID (cached)
- `GET /users/email/:email` - Get user by email (cached)
- `POST /users` - Create new user

### Sessions
- `GET /sessions/:token` - Get session by token (cached)

### Cache Management
- `DELETE /cache` - Clear all cache entries

## Database Models

### User
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sessions  Session[]
}
```

### Session
```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Scripts

```bash
# Development
pnpm dev              # Start development server with watch mode

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema changes
pnpm db:migrate       # Run migrations
pnpm db:reset         # Reset database
pnpm db:studio        # Open Prisma Studio

# Production
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run Biome.js linter
pnpm check-types      # TypeScript type checking
```

## Performance Features

### Redis Optimizations
- **Connection pooling** with retry logic
- **Key prefixing** for namespace isolation
- **TTL management** with configurable expiration
- **JSON serialization** for complex objects
- **Error handling** with fallback to database

### Database Optimizations
- **Prisma connection pooling**
- **Prepared statements** via Prisma
- **Query optimization** with selective fields
- **Database indexes** on frequently queried fields

### Cache Strategies
- **Cache-aside pattern** for reads
- **Write-through** for consistency
- **Cache invalidation** on updates
- **Bulk operations** support

## Error Handling

Custom error types with structured responses:

```typescript
// Database operations
DatabaseError: { operation, originalError }

// Cache operations  
CacheError: { key, originalError }

// Input validation
ValidationError: { field, value }
```

## Development Notes

- All service files use **kebab-case** naming convention
- **Modular architecture** with clear separation of concerns
- **Type-safe** operations with Prisma generated types
- **Environment validation** prevents runtime errors
- **Graceful shutdown** ensures data consistency