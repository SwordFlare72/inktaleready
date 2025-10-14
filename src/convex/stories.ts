import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get all published stories with pagination
export const getPublishedStories = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
    genre: v.optional(v.string()),
    sortBy: v.optional(v.union(v.literal("popular"), v.literal("recent"), v.literal("views"))),
  },
  handler: async (ctx, args) => {
    // Use index for published stories
    let base = ctx.db
      .query("stories")
      .withIndex("by_published", (q) => q.eq("isPublished", true));

    // Keep simple optional genre filter (no composite index yet)
    if (args.genre) {
      base = base.filter((q) => q.eq(q.field("genre"), args.genre));
    }

    // NOTE: Ordering is temporarily omitted to avoid type issues and since we lack composite indexes.
    // If needed, we can add specific indexed sorting in a follow-up change.

    const result = await base.paginate(args.paginationOpts);

    // Attach author info
    const pageWithAuthors = await Promise.all(
      result.page.map(async (story) => {
        const author = await ctx.db.get(story.authorId);
        return {
          ...story,
          author: author ? { name: author.name, image: author.image } : null,
        };
      })
    );

    return {
      ...result,
      page: pageWithAuthors,
    };
  },
});

// Get story by ID with author info
export const getStoryById = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story) return null;

    const author = await ctx.db.get(story.authorId);
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .order("asc")
      .collect();

    return {
      ...story,
      author: author ? { name: author.name, image: author.image, avatarImage: (author as any).avatarImage } : null,
      chapters: chapters.map(ch => ({
        _id: ch._id,
        title: ch.title,
        chapterNumber: ch.chapterNumber,
        wordCount: ch.wordCount,
        views: ch.views,
        likes: ch.likes,
        comments: ch.comments,
        _creationTime: ch._creationTime,
      })),
    };
  },
});

// Create a new story
export const createStory = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    genre: v.string(),
    tags: v.array(v.string()),
    coverImage: v.optional(v.string()),
    language: v.optional(v.string()),
    isMature: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated to create a story");

    // Normalize, de-duplicate and cap tags to 20
    const tags: string[] = Array.from(
      new Set(
        args.tags
          .map(t => t.trim())
          .filter(Boolean)
          .map(t => t.toLowerCase())
      )
    ).slice(0, 20);

    const storyId = await ctx.db.insert("stories", {
      title: args.title,
      description: args.description,
      authorId: user._id,
      genre: args.genre as any,
      tags,
      coverImage: args.coverImage,
      isCompleted: false,
      totalChapters: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      lastUpdated: Date.now(),
      isPublished: false,
      language: args.language,
      isMature: args.isMature || false,
    });

    // Mark user as writer if not already
    if (!user.isWriter) {
      await ctx.db.patch(user._id, { isWriter: true });
    }

    return storyId;
  },
});

// Get stories by current user
export const getMyStories = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("stories")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .order("desc")
      .collect();
  },
});

// Update story
export const updateStory = mutation({
  args: {
    storyId: v.id("stories"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    genre: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    coverImage: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
    isPublished: v.optional(v.boolean()),
    language: v.optional(v.string()),
    isMature: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");
    if (story.authorId !== user._id) throw new Error("Not authorized");

    // Detect publish transition BEFORE patching
    const becomingPublished =
      args.isPublished === true && story.isPublished === false;

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.genre !== undefined) updates.genre = args.genre;
    if (args.tags !== undefined) {
      // Normalize, de-duplicate and cap to 20
      updates.tags = Array.from(
        new Set(
          args.tags
            .map(t => t.trim())
            .filter(Boolean)
            .map(t => t.toLowerCase())
        )
      ).slice(0, 20);
    }
    if (args.coverImage !== undefined) updates.coverImage = args.coverImage;
    if (args.isCompleted !== undefined) updates.isCompleted = args.isCompleted;
    if (args.isPublished !== undefined) updates.isPublished = args.isPublished;
    if (args.language !== undefined) updates.language = args.language;
    if (args.isMature !== undefined) updates.isMature = args.isMature;
    
    updates.lastUpdated = Date.now();

    await ctx.db.patch(args.storyId, updates);

    // If just published, notify all followers of this author
    if (becomingPublished) {
      const followers = await ctx.db
        .query("follows")
        .withIndex("by_following", (q) => q.eq("followingId", user._id))
        .collect();

      // Insert notifications for each follower
      await Promise.all(
        followers.map((f) =>
          ctx.db.insert("notifications", {
            userId: f.followerId,
            type: "new_story",
            title: "New story published",
            message: `${user.name || "An author you follow"} published “${updates.title ?? story.title}”`,
            isRead: false,
            relatedId: String(args.storyId),
          })
        )
      );
    }

    return args.storyId;
  },
});

// Follow/unfollow a story
export const toggleStoryFollow = mutation({
  args: {
    storyId: v.id("stories"),
    isFavorite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const existing = await ctx.db
      .query("storyFollows")
      .withIndex("by_user_and_story", (q) => 
        q.eq("userId", user._id).eq("storyId", args.storyId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    } else {
      await ctx.db.insert("storyFollows", {
        userId: user._id,
        storyId: args.storyId,
        isFavorite: args.isFavorite || false,
      });
      return true;
    }
  },
});

// Search stories
export const searchStories = query({
  args: {
    searchTerm: v.string(),
    genre: v.optional(v.string()),
    // Add advanced filters
    sortBy: v.optional(v.union(v.literal("popular"), v.literal("recent"), v.literal("views"))),
    minChapters: v.optional(v.number()),
    hasCover: v.optional(v.boolean()),
    // Add: tag filter (match any of up to 5 tags)
    tagsAny: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Simple text search - in production you'd want full-text search
    const stories = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    // Start with all, then apply filters incrementally
    let filtered = stories;

    const term = args.searchTerm.trim().toLowerCase();
    if (term.length > 0) {
      filtered = filtered.filter(
        (story) =>
          story.title.toLowerCase().includes(term) ||
          story.description.toLowerCase().includes(term) ||
          story.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    if (args.tagsAny && args.tagsAny.length > 0) {
      const want = args.tagsAny
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 5);
      if (want.length > 0) {
        filtered = filtered.filter((story) =>
          story.tags.some((tag) => want.includes(tag.toLowerCase()))
        );
      }
    }

    if (args.genre) {
      filtered = filtered.filter((story) => story.genre === args.genre);
    }

    // Apply additional filters
    if (args.minChapters !== undefined) {
      filtered = filtered.filter((story) => story.totalChapters >= args.minChapters!);
    }
    if (args.hasCover) {
      filtered = filtered.filter((story) => !!story.coverImage && story.coverImage.length > 0);
    }

    // Apply sorting
    if (args.sortBy === "popular") {
      filtered.sort((a, b) => b.totalLikes - a.totalLikes);
    } else if (args.sortBy === "views") {
      filtered.sort((a, b) => b.totalViews - a.totalViews);
    } else {
      // recent by lastUpdated desc
      filtered.sort((a, b) => b.lastUpdated - a.lastUpdated);
    }

    // Get author info
    const storiesWithAuthors = await Promise.all(
      filtered.map(async (story) => {
        const author = await ctx.db.get(story.authorId);
        return {
          ...story,
          author: author ? { name: author.name, image: author.image } : null,
        };
      })
    );

    return storiesWithAuthors;
  },
});

// Get stories for explore page with filtering and sorting
export const listExplore = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
    genre: v.optional(v.string()),
    sortBy: v.optional(v.union(v.literal("popular"), v.literal("recent"), v.literal("views"))),
  },
  handler: async (ctx, args) => {
    let base;
    
    if (args.genre) {
      base = ctx.db
        .query("stories")
        .withIndex("by_published_and_genre", (q) => 
          q.eq("isPublished", true).eq("genre", args.genre as any)
        );
    } else {
      base = ctx.db
        .query("stories")
        .withIndex("by_published", (q) => q.eq("isPublished", true));
    }

    // Apply ordering based on sortBy
    if (args.sortBy === "recent") {
      base = base.order("desc");
    } else {
      // For popular/views, we'll sort in memory within the page
      base = base.order("desc");
    }

    const result = await base.paginate(args.paginationOpts);

    // Sort in memory for popular/views (within the current page only)
    if (args.sortBy === "popular") {
      result.page.sort((a, b) => b.totalLikes - a.totalLikes);
    } else if (args.sortBy === "views") {
      result.page.sort((a, b) => b.totalViews - a.totalViews);
    }

    // Attach author info
    const pageWithAuthors = await Promise.all(
      result.page.map(async (story) => {
        const author = await ctx.db.get(story.authorId);
        return {
          ...story,
          author: author ? { name: author.name, image: author.image } : null,
        };
      })
    );

    return {
      ...result,
      page: pageWithAuthors,
    };
  },
});

// Check if user is following a story
export const isFollowing = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;

    const follow = await ctx.db
      .query("storyFollows")
      .withIndex("by_user_and_story", (q) => 
        q.eq("userId", user._id).eq("storyId", args.storyId)
      )
      .unique();

    return !!follow;
  },
});

// Delete a story (with cascading deletes)
export const deleteStory = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");
    if (story.authorId !== user._id) throw new Error("Not authorized");

    // Delete all chapters
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .collect();

    for (const chapter of chapters) {
      await ctx.db.delete(chapter._id);
    }

    // Delete story follows
    const follows = await ctx.db
      .query("storyFollows")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .collect();

    for (const follow of follows) {
      await ctx.db.delete(follow._id);
    }

    // Delete reading progress
    const progress = await ctx.db.query("readingProgress").collect();
    for (const prog of progress) {
      if (prog.storyId === args.storyId) {
        await ctx.db.delete(prog._id);
      }
    }

    // Delete the story
    await ctx.db.delete(args.storyId);
    return true;
  },
});

// Get writer stats
export const myStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const stories = await ctx.db
      .query("stories")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .collect();

    const totalViews = stories.reduce((sum, story) => sum + story.totalViews, 0);
    const totalLikes = stories.reduce((sum, story) => sum + story.totalLikes, 0);
    const totalComments = stories.reduce((sum, story) => sum + story.totalComments, 0);
    const publishedStories = stories.filter(s => s.isPublished).length;

    return {
      totalStories: stories.length,
      publishedStories,
      totalViews,
      totalLikes,
      totalComments,
      stories: stories.map(story => ({
        _id: story._id,
        title: story.title,
        totalViews: story.totalViews,
        totalLikes: story.totalLikes,
        totalComments: story.totalComments,
        isPublished: story.isPublished,
      })),
    };
  },
});