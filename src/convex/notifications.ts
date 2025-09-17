import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get notifications for current user
export const listForUser = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], isDone: true, continueCursor: null };

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Mark notification as read
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

// Mark all notifications as read
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    await Promise.all(
      unreadNotifications.map(notification =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );
  },
});

// Internal helper to create notifications
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("new_chapter"),
      v.literal("new_story"),
      v.literal("comment_reply"),
      v.literal("comment_like"),
      v.literal("new_follower")
    ),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      isRead: false,
      relatedId: args.relatedId,
    });
  },
});