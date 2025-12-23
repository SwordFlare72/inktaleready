# View Convex environment variables
npx convex env list

# Set environment variable
npx convex env set KEY "value"

# Remove environment variable
npx convex env unset KEY

# View Convex logs
npx convex logs

# Run Convex function manually
npx convex run functionName '{"arg": "value"}'

# Type check
pnpm tsc --noEmit

# Lint
pnpm lint