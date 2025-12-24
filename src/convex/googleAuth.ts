import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Create or update user from Google OAuth
export const createOrUpdateGoogleUser = internalMutation({
  args: {
    googleId: v.string(),
    email: v.string(),
    name: v.string(),
    picture: v.optional(v.string()),
    emailVerified: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if user exists by email
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();

    if (user) {
      // Update existing user with Google info
      await ctx.db.patch(user._id, {
        image: args.picture || user.image,
        emailVerificationTime: args.emailVerified ? Date.now() : user.emailVerificationTime,
      });
      return user._id;
    }

    // Create new user
    const newUserId = await ctx.db.insert("users", {
      email: args.email,
      authEmail: args.email,
      name: args.name,
      image: args.picture,
      emailVerificationTime: args.emailVerified ? Date.now() : undefined,
      isAnonymous: false,
    });

    // Create auth account record
    await ctx.db.insert("authAccounts", {
      userId: newUserId,
      provider: "google",
      providerAccountId: args.googleId,
    });

    return newUserId;
  },
});