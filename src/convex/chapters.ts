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

// Add: list all chapters (draft + published) for manage view
export const listForManage = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .order("asc")
      .collect();
    return chapters;
  },
});

// Create a new chapter
export const createChapter = mutation({
  args: {
    storyId: v.id("stories"),
    title: v.string(),
    content: v.string(),
    isDraft: v.optional(v.boolean()),
    // Add: chapter cover
    coverImage: v.optional(v.string()),
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
    const draft = args.isDraft ?? true;

    const chapterId = await ctx.db.insert("chapters", {
      storyId: args.storyId,
      title: args.title,
      content: args.content,
      chapterNumber,
      wordCount,
      views: 0,
      likes: 0,
      comments: 0,
      isPublished: !draft,
      isDraft: draft,
      coverImage: args.coverImage,
    });

    // Update story stats only when published
    if (!draft) {
      await ctx.db.patch(args.storyId, {
        totalChapters: story.totalChapters + 1,
        lastUpdated: Date.now(),
      });

      // Notify story followers about new chapter
      const followers = await ctx.db
        .query("storyFollows")
        .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
        .collect();

      for (const follow of followers) {
        await ctx.db.insert("notifications", {
          userId: follow.userId,
          type: "new_chapter",
          title: "New Chapter Published",
          message: `"${story.title}" has a new chapter: "${args.title}"`,
          isRead: false,
          relatedId: chapterId,
        });
      }
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
    // Add: cover image update
    coverImage: v.optional(v.string()),
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
    if (args.coverImage !== undefined) updates.coverImage = args.coverImage;
    if (args.isPublished !== undefined) updates.isPublished = args.isPublished;
    if (args.isDraft !== undefined) updates.isDraft = args.isDraft;

    const prevPublished = chapter.isPublished;
    const nextPublished =
      updates.isPublished !== undefined ? updates.isPublished : chapter.isPublished;

    await ctx.db.patch(args.chapterId, updates);

    // Update story last updated time
    await ctx.db.patch(chapter.storyId, {
      lastUpdated: Date.now(),
    });

    // Handle publish state transitions for totals + notifications
    if (!prevPublished && nextPublished) {
      await ctx.db.patch(chapter.storyId, {
        totalChapters: story.totalChapters + 1,
      });

      const followers = await ctx.db
        .query("storyFollows")
        .withIndex("by_story", (q) => q.eq("storyId", chapter.storyId))
        .collect();

      for (const follow of followers) {
        await ctx.db.insert("notifications", {
          userId: follow.userId,
          type: "new_chapter",
          title: "New Chapter Published",
          message: `"${story.title}" has a new chapter: "${updates.title ?? chapter.title}"`,
          isRead: false,
          relatedId: args.chapterId,
        });
      }
    } else if (prevPublished && !nextPublished) {
      await ctx.db.patch(chapter.storyId, {
        totalChapters: Math.max(0, story.totalChapters - 1),
      });
    }

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

    // Fetch parent story for aggregate updates
    const story = await ctx.db.get(chapter.storyId);

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.chapterId, {
        likes: Math.max(0, chapter.likes - 1),
      });

      // Decrement story totalLikes if available
      if (story) {
        await ctx.db.patch(chapter.storyId, {
          totalLikes: Math.max(0, story.totalLikes - 1),
        });
      }

      return false;
    } else {
      await ctx.db.insert("chapterLikes", {
        userId: user._id,
        chapterId: args.chapterId,
      });
      await ctx.db.patch(args.chapterId, {
        likes: chapter.likes + 1,
      });

      // Increment story totalLikes if available
      if (story) {
        await ctx.db.patch(chapter.storyId, {
          totalLikes: story.totalLikes + 1,
        });
      }

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

// Get adjacent chapters for navigation
export const getAdjacent = query({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) return { prevId: null, nextId: null };

    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_story", (q) => q.eq("storyId", chapter.storyId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .order("asc")
      .collect();

    const currentIndex = chapters.findIndex(ch => ch._id === args.chapterId);
    
    return {
      prevId: currentIndex > 0 ? chapters[currentIndex - 1]._id : null,
      nextId: currentIndex < chapters.length - 1 ? chapters[currentIndex + 1]._id : null,
    };
  },
});

// Delete a chapter
export const deleteChapter = mutation({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) throw new Error("Chapter not found");

    const story = await ctx.db.get(chapter.storyId);
    if (!story) throw new Error("Story not found");
    if (story.authorId !== user._id) throw new Error("Not authorized");

    // Delete chapter likes
    const likes = await ctx.db
      .query("chapterLikes")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();
    const likesCount = likes.length;

    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    // Delete comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Update story totals
    const patches: Record<string, number> = {
      lastUpdated: Date.now(),
    } as any;

    if (chapter.isPublished) {
      patches.totalChapters = Math.max(0, story.totalChapters - 1);
    }

    // Subtract this chapter's likes from story totalLikes
    patches.totalLikes = Math.max(0, story.totalLikes - likesCount);

    await ctx.db.patch(chapter.storyId, patches as any);

    await ctx.db.delete(args.chapterId);
    return true;
  },
});