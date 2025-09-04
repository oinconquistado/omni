# Port Configuration

This monorepo uses environment variables to configure application ports.

## Default Ports

| Application | Port | Environment Variable |
|-------------|------|---------------------|
| omni-client | 3000 | `CLIENT_PORT` |
| omni-admin  | 3001 | `ADMIN_PORT` |
| omni-server | 3002 | `SERVER_PORT` |

## Configuration

1. Copy `.env.example` to `.env` in the root directory
2. Copy `.env.example` files in each app directory if needed
3. Modify port values as desired

## Usage

```bash
# Use default ports
pnpm dev

# Or set custom ports
CLIENT_PORT=4000 ADMIN_PORT=4001 SERVER_PORT=4002 pnpm dev
```

The frontend applications will automatically use the `NEXT_PUBLIC_API_BASE_URL` environment variable to connect to the backend API.