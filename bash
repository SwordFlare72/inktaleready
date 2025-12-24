# 1. Setup
cd /path/to/your/project
pnpm install
npx convex login
npx convex dev --once

# 2. Configure environment
npx convex env set CONVEX_SITE_URL http://localhost:5173
npx convex env set GOOGLE_CLIENT_ID "your-client-id"
npx convex env set GOOGLE_CLIENT_SECRET "your-client-secret"

# 3. Start development
# Terminal 1:
npx convex dev

# Terminal 2:
pnpm dev

# 4. Deploy to production (when ready)
npx convex deploy
npx convex env set CONVEX_SITE_URL https://your-domain.com --prod
npx convex env set GOOGLE_CLIENT_ID "your-client-id" --prod
npx convex env set GOOGLE_CLIENT_SECRET "your-client-secret" --prod