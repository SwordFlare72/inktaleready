# Install dependencies
pnpm install

# Start Convex dev server
npx convex dev

# Start Vite dev server
pnpm dev

# Type checking
npx tsc -b --noEmit

# Run Convex function
npx convex run <functionName> '{"arg": "value"}'
