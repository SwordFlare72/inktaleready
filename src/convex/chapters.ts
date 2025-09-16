import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get chapter by ID
export const getChapterById = query({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) return null;

    const story = await ctx.db.get(chapter.storyId);
    if (!story) return null;

    const author = await ctx.db.get(story.authorId);

    return {
      ...chapter,
      story: {
        ...story,
        author: author ? { name: author.name, image: author.image } : null,
      },
    };
  },
});

// Get chapters for a story
export const getChaptersByStory = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chapters")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .order("asc")
      .collect();
  },
});

// Create a new chapter
export const createChapter = mutation({
  args: {
    storyId: v.id("stories"),
    title: v.string(),
    content: v.string(),
    isDraft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");
    if (story.authorId !== user._id) throw new Error("Not authorized");

    // Get next chapter number
    const existingChapters = await ctx.db
      .query("chapters")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .collect();
    
    const chapterNumber = existingChapters.length + 1;
    const wordCount = args.content.split(/\s+/).length;

    const chapterId = await ctx.db.insert("chapters", {
      storyId: args.storyId,
      title: args.title,
      content: args.content,
      chapterNumber,
      wordCount,
      views: 0,
      likes: 0,
      comments: 0,
      isPublished: !args.isDraft,
      isDraft: args.isDraft || false,
    });

    // Update story stats
    if (!args.isDraft) {
      await ctx.db.patch(args.storyId, {
        totalChapters: story.totalChapters + 1,
        lastUpdated: Date.now(),
      });
    }

    return chapterId;
  },
});

// Update chapter
export const updateChapter = mutation({
  args: {
    chapterId: v.id("chapters"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    isDraft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) throw new Error("Chapter not found");

    const story = await ctx.db.get(chapter.storyId);
    if (!story) throw new Error("Story not found");
    if (story.authorId !== user._id) throw new Error("Not authorized");

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) {
      updates.content = args.content;
      updates.wordCount = args.content.split(/\s+/).length;
    }
    if (args.isPublished !== undefined) updates.isPublished = args.isPublished;
    if (args.isDraft !== undefined) updates.isDraft = args.isDraft;

    await ctx.db.patch(args.chapterId, updates);

    // Update story last updated time
    await ctx.db.patch(chapter.storyId, {
      lastUpdated: Date.now(),
    });

    return args.chapterId;
  },
});

// Increment chapter views
export const incrementChapterViews = mutation({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) return;

    await ctx.db.patch(args.chapterId, {
      views: chapter.views + 1,
    });

    // Also increment story views
    const story = await ctx.db.get(chapter.storyId);
    if (story) {
      await ctx.db.patch(chapter.storyId, {
        totalViews: story.totalViews + 1,
      });
    }
  },
});

// Like/unlike a chapter
export const toggleChapterLike = mutation({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const existing = await ctx.db
      .query("chapterLikes")
      .withIndex("by_user_and_chapter", (q) => 
        q.eq("userId", user._id).eq("chapterId", args.chapterId)
      )
      .unique();

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) throw new Error("Chapter not found");

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.chapterId, {
        likes: Math.max(0, chapter.likes - 1),
      });
      return false;
    } else {
      await ctx.db.insert("chapterLikes", {
        userId: user._id,
        chapterId: args.chapterId,
      });
      await ctx.db.patch(args.chapterId, {
        likes: chapter.likes + 1,
      });
      return true;
    }
  },
});

// Check if user liked a chapter
export const hasUserLikedChapter = query({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;

    const like = await ctx.db
      .query("chapterLikes")
      .withIndex("by_user_and_chapter", (q) => 
        q.eq("userId", user._id).eq("chapterId", args.chapterId)
      )
      .unique();

    return !!like;
  },
});
