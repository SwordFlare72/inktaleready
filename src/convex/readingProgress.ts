import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get reading progress for a story
export const getProgress = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("readingProgress")
      .withIndex("by_user_and_story", (q) => 
        q.eq("userId", user._id).eq("storyId", args.storyId)
      )
      .unique();
  },
});

// Set reading progress
export const setProgress = mutation({
  args: {
    storyId: v.id("stories"),
    chapterId: v.id("chapters"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const existing = await ctx.db
      .query("readingProgress")
      .withIndex("by_user_and_story", (q) => 
        q.eq("userId", user._id).eq("storyId", args.storyId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastChapterId: args.chapterId,
        lastReadAt: Date.now(),
      });
    } else {
      await ctx.db.insert("readingProgress", {
        userId: user._id,
        storyId: args.storyId,
        lastChapterId: args.chapterId,
        lastReadAt: Date.now(),
      });
    }
  },
});
