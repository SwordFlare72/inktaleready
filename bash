# 1. Set Google Client ID for your local Convex backend
npx convex env set GOOGLE_CLIENT_ID "49136963756-u8li6bid91ojnvnlbgd7ngoejp90puiv.apps.googleusercontent.com"

# 2. Set Google Client Secret for your local Convex backend
npx convex env set GOOGLE_CLIENT_SECRET "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"

# 3. Verify that these are now set in your local Convex deployment
npx convex env get GOOGLE_CLIENT_ID
npx convex env get GOOGLE_CLIENT_SECRET
npx convex env get CONVEX_SITE_URL # This should ideally show your local Convex URL