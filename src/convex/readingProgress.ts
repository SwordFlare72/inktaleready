import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get reading progress for a story
export const getProgress = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const doc =
      await ctx.db
        .query("readingProgress")
        .withIndex("by_user_and_story", (q) =>
          q.eq("userId", user._id).eq("storyId", args.storyId)
        )
        .unique();

    if (!doc) return null;

    // Enrich with percent and lastReadIndex so the UI can render a progress bar
    // Prefer the story's totalChapters field to avoid scanning chapters unnecessarily
    const story = await ctx.db.get(args.storyId);
    let totalChapters =
      typeof story?.totalChapters === "number" ? story.totalChapters : undefined;

    let lastReadIndex: number | undefined = undefined;

    // If we need the index (for a better percent) or totalChapters is unknown, load chapters
    if (!totalChapters || totalChapters <= 0 || !doc.lastChapterId) {
      const chapters = await ctx.db
        .query("chapters")
        .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
        .order("asc")
        .collect();

      totalChapters = chapters.length;
      if (doc.lastChapterId) {
        const idx = chapters.findIndex((c) => c._id === doc.lastChapterId);
        if (idx >= 0) lastReadIndex = idx;
      }
    } else if (doc.lastChapterId) {
      // totalChapters known from story; still compute index for a precise percent
      const chapters = await ctx.db
        .query("chapters")
        .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
        .order("asc")
        .collect();
      const idx = chapters.findIndex((c) => c._id === doc.lastChapterId);
      if (idx >= 0) lastReadIndex = idx;
    }

    let percent = 0;
    if (typeof totalChapters === "number" && totalChapters > 0) {
      // If we have an index, compute based on index; otherwise treat as started (1 of total)
      const completedCount =
        typeof lastReadIndex === "number" ? lastReadIndex + 1 : 1;
      percent = Math.max(
        0,
        Math.min(100, Math.round((completedCount / totalChapters) * 100))
      );
    }

    return {
      ...doc,
      // extras used by the frontend tiles
      percent,
      lastReadIndex: typeof lastReadIndex === "number" ? lastReadIndex : undefined,
    };
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