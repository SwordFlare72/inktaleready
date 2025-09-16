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
      author: author ? { name: author.name, image: author.image } : null,
      chapters: chapters.map(ch => ({
        _id: ch._id,
        title: ch.title,
        chapterNumber: ch.chapterNumber,
        wordCount: ch.wordCount,
        views: ch.views,
        likes: ch.likes,
        comments: ch.comments,
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
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated to create a story");

    const storyId = await ctx.db.insert("stories", {
      title: args.title,
      description: args.description,
      authorId: user._id,
      genre: args.genre as any,
      tags: args.tags,
      coverImage: args.coverImage,
      isCompleted: false,
      totalChapters: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      lastUpdated: Date.now(),
      isPublished: false,
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
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");
    if (story.authorId !== user._id) throw new Error("Not authorized");

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.genre !== undefined) updates.genre = args.genre;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.coverImage !== undefined) updates.coverImage = args.coverImage;
    if (args.isCompleted !== undefined) updates.isCompleted = args.isCompleted;
    if (args.isPublished !== undefined) updates.isPublished = args.isPublished;
    
    updates.lastUpdated = Date.now();

    await ctx.db.patch(args.storyId, updates);
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
  },
  handler: async (ctx, args) => {
    // Simple text search - in production you'd want full-text search
    const stories = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    let filtered = stories.filter(story => 
      story.title.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
      story.description.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
      story.tags.some(tag => tag.toLowerCase().includes(args.searchTerm.toLowerCase()))
    );

    if (args.genre) {
      filtered = filtered.filter(story => story.genre === args.genre);
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