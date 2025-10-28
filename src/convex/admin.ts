import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

// Danger: This permanently deletes ALL application data, including user docs.
// After running, all sessions will be broken and sign-ins will fail until new accounts are created.
export const wipeAll = mutation({
  args: {
    confirm: v.literal("CONFIRM"),
  },
  handler: async (ctx) => {
    // Order matters slightly so we remove child rows first where possible.
    const tables: Array<keyof typeof ctx.db> = [
      // leaf/relationship tables
      "chapterLikes" as any,
      "commentReactions" as any,
      "readingProgress" as any,
      "readingLists" as any,
      "storyFollows" as any,
      "notifications" as any,
      "comments" as any,
      "messages" as any,
      "reports" as any,
      // content tables
      "chapters" as any,
      "stories" as any,
      // finally users
      "users" as any,
    ];

    for (const table of tables) {
      // Use async iteration to avoid loading all into memory at once.
      const q = ctx.db.query(table as any);
      // eslint-disable-next-line no-restricted-syntax
      for await (const row of q) {
        await ctx.db.delete(row._id);
      }
    }

    return { ok: true };
  },
});

// Add: grant self admin if email is in ADMIN_ALLOWED_EMAILS
export const grantSelfAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Must be authenticated");

    const allowList = (process.env.ADMIN_ALLOWED_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const myEmail = (me.email || "").trim().toLowerCase();
    if (!myEmail || !allowList.includes(myEmail)) {
      throw new Error("Your email is not authorized to grant admin");
    }

    await ctx.db.patch(me._id, { role: "admin" as any });
    return { ok: true, role: "admin" };
  },
});

// Helper to check if user is admin
async function requireAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

// Update user role (admin only)
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { role: args.role });
    return { success: true };
  },
});

// Delete user (admin only)
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    // Delete user's stories
    const stories = await ctx.db
      .query("stories")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();
    
    for (const story of stories) {
      // Delete chapters
      const chapters = await ctx.db
        .query("chapters")
        .withIndex("by_story", (q) => q.eq("storyId", story._id))
        .collect();
      for (const chapter of chapters) {
        await ctx.db.delete(chapter._id);
      }
      await ctx.db.delete(story._id);
    }
    
    // Delete user's comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }
    
    // Delete user
    await ctx.db.delete(args.userId);
    return { success: true };
  },
});

// Delete story as admin
export const deleteStoryAsAdmin = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");
    
    // Delete chapters
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
    
    // Delete story
    await ctx.db.delete(args.storyId);
    return { success: true };
  },
});

// Update report status (admin only)
export const updateReportStatus = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(v.literal("pending"), v.literal("resolved"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.reportId, { status: args.status });
    return { success: true };
  },
});