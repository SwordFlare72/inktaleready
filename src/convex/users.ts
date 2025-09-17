import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user === null) {
      return null;
    }

    return user;
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

// Add: is user following another user?
export const isFollowingUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) return false;
    if (me._id === args.userId) return false;

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", me._id))
      .filter((q) => q.eq(q.field("followingId"), args.userId))
      .unique();

    return !!existing;
  },
});

// Add: list followers of a user
export const listFollowers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();

    const users = await Promise.all(
      rows.map(async (r) => {
        const u = await ctx.db.get(r.followerId);
        if (!u) return null;
        return {
          _id: u._id,
          name: u.name,
          image: u.image,
          bio: u.bio,
        };
      })
    );

    return users.filter(Boolean);
  },
});

// Add: list following of a user
export const listFollowing = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    const users = await Promise.all(
      rows.map(async (r) => {
        const u = await ctx.db.get(r.followingId);
        if (!u) return null;
        return {
          _id: u._id,
          name: u.name,
          image: u.image,
          bio: u.bio,
        };
      })
    );

    return users.filter(Boolean);
  },
});

// Get user by ID (public profile)
export const getUserPublic = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get user's published stories
    const stories = await ctx.db
      .query("stories")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    // Followers
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();

    // Add: Following count
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    return {
      _id: user._id,
      name: user.name,
      image: user.image,
      bio: user.bio,
      isWriter: user.isWriter,
      writerLevel: user.writerLevel || 1,
      totalFollowers: followers.length,
      totalFollowing: following.length, // Add: following count
      stories: stories.map(story => ({
        _id: story._id,
        title: story.title,
        description: story.description,
        genre: story.genre,
        totalViews: story.totalViews,
        totalLikes: story.totalLikes,
        totalChapters: story.totalChapters,
        coverImage: story.coverImage,
      })),
    };
  },
});

// Update current user profile
export const updateMe = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.image !== undefined) updates.image = args.image;
    if (args.bio !== undefined) updates.bio = args.bio;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

// List user's published stories
export const listUserStories = query({
  args: {
    userId: v.id("users"),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stories")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Follow/unfollow a user
export const toggleUserFollow = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");
    if (user._id === args.userId) throw new Error("Cannot follow yourself");

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .filter((q) => q.eq(q.field("followingId"), args.userId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    } else {
      await ctx.db.insert("follows", {
        followerId: user._id,
        followingId: args.userId,
      });
      return true;
    }
  },
});