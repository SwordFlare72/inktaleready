import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// List followed stories
export const listFollows = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
    sortBy: v.optional(v.union(v.literal("recent"), v.literal("oldest"), v.literal("alphabetical"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], isDone: true, continueCursor: null };

    const follows = await ctx.db
      .query("storyFollows")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .paginate(args.paginationOpts);

    const storiesWithDetails = await Promise.all(
      follows.page.map(async (follow) => {
        const story = await ctx.db.get(follow.storyId);
        if (!story) return null;
        
        const author = await ctx.db.get(story.authorId);
        return {
          ...story,
          author: author ? { name: author.name, image: author.image } : null,
          followedAt: follow._creationTime,
          isFavorite: follow.isFavorite,
        };
      })
    );

    const validStories = storiesWithDetails.filter(Boolean);

    // Sort stories
    if (args.sortBy === "alphabetical") {
      validStories.sort((a, b) => a!.title.localeCompare(b!.title));
    } else if (args.sortBy === "oldest") {
      validStories.sort((a, b) => a!.followedAt - b!.followedAt);
    } else {
      // Default to recent
      validStories.sort((a, b) => b!.followedAt - a!.followedAt);
    }

    return {
      ...follows,
      page: validStories,
    };
  },
});

// List reading history
export const listHistory = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], isDone: true, continueCursor: null };

    const progress = await ctx.db
      .query("readingProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);

    const storiesWithDetails = await Promise.all(
      progress.page.map(async (prog) => {
        const story = await ctx.db.get(prog.storyId);
        if (!story) return null;
        
        const author = await ctx.db.get(story.authorId);
        const lastChapter = await ctx.db.get(prog.lastChapterId);
        
        return {
          ...story,
          author: author ? { name: author.name, image: author.image } : null,
          lastReadAt: prog.lastReadAt,
          lastChapter: lastChapter ? {
            _id: lastChapter._id,
            title: lastChapter.title,
            chapterNumber: lastChapter.chapterNumber,
          } : null,
        };
      })
    );

    return {
      ...progress,
      page: storiesWithDetails.filter(Boolean),
    };
  },
});

// Create reading list
export const createList = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    return await ctx.db.insert("readingLists", {
      userId: user._id,
      name: args.name,
      description: args.description,
      isPublic: args.isPublic,
      storyIds: [],
    });
  },
});

// Add story to reading list
export const addToList = mutation({
  args: {
    listId: v.id("readingLists"),
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) {
      throw new Error("Reading list not found");
    }

    if (!list.storyIds.includes(args.storyId)) {
      await ctx.db.patch(args.listId, {
        storyIds: [...list.storyIds, args.storyId],
      });
    }
  },
});

// Remove story from reading list
export const removeFromList = mutation({
  args: {
    listId: v.id("readingLists"),
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) {
      throw new Error("Reading list not found");
    }

    await ctx.db.patch(args.listId, {
      storyIds: list.storyIds.filter(id => id !== args.storyId),
    });
  },
});

// List user's reading lists
export const listMyLists = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const lists = await ctx.db
      .query("readingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return await Promise.all(
      lists.map(async (list) => {
        const stories = await Promise.all(
          list.storyIds.map(async (storyId) => {
            const story = await ctx.db.get(storyId);
            if (!story) return null;
            const author = await ctx.db.get(story.authorId);
            return {
              ...story,
              author: author ? { name: author.name, image: author.image } : null,
            };
          })
        );

        return {
          ...list,
          stories: stories.filter(Boolean),
          storyCount: stories.filter(Boolean).length,
        };
      })
    );
  },
});

export const listPublicListsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const lists = await ctx.db
      .query("readingLists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const publicLists = lists.filter((l) => l.isPublic);

    return await Promise.all(
      publicLists.map(async (list) => {
        const stories = await Promise.all(
          list.storyIds.map(async (storyId) => {
            const story = await ctx.db.get(storyId);
            if (!story) return null;
            const author = await ctx.db.get(story.authorId);
            return {
              ...story,
              author: author ? { name: author.name, image: author.image } : null,
            };
          })
        );

        const validStories = stories.filter(Boolean);
        return {
          ...list,
          stories: validStories,
          storyCount: validStories.length,
        };
      })
    );
  },
});

// Add: rename a reading list
export const renameList = mutation({
  args: {
    listId: v.id("readingLists"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) {
      throw new Error("Reading list not found");
    }

    await ctx.db.patch(args.listId, { name: args.name.trim() });
  },
});

// Add: delete a reading list
export const deleteList = mutation({
  args: {
    listId: v.id("readingLists"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) {
      throw new Error("Reading list not found");
    }

    await ctx.db.delete(args.listId);
  },
});

// Get a single reading list by id with populated stories (owner-guarded)
export const getListById = query({
  args: { listId: v.id("readingLists") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) return null;

    const stories = await Promise.all(
      list.storyIds.map(async (storyId) => {
        const story = await ctx.db.get(storyId);
        if (!story) return null;
        const author = await ctx.db.get(story.authorId);
        return {
          ...story,
          author: author ? { name: author.name, image: author.image } : null,
        };
      }),
    );

    const validStories = stories.filter(Boolean);
    return {
      ...list,
      stories: validStories,
      storyCount: validStories.length,
    };
  },
});