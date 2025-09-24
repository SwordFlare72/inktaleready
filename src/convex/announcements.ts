import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// List announcements by user (newest first, paginated)
export const listByUser = query({
  args: {
    userId: v.id("users"),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("announcements")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .order("desc")
      .paginate(args.paginationOpts);

    const withAuthor = await Promise.all(
      page.page.map(async (a) => {
        const author = await ctx.db.get(a.authorId);
        return {
          ...a,
          author: author ? { name: author.name, image: author.image } : null,
        };
      })
    );

    return { ...page, page: withAuthor };
  },
});

// List replies for an announcement (ascending)
export const listReplies = query({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const replies = await ctx.db
      .query("announcementReplies")
      .withIndex("by_announcement", (q) => q.eq("announcementId", args.announcementId))
      .order("asc")
      .collect();

    return await Promise.all(
      replies.map(async (r) => {
        const author = await ctx.db.get(r.authorId);
        return {
          ...r,
          author: author ? { name: author.name, image: author.image } : null,
        };
      })
    );
  },
});

// Create announcement (author only). Notifies followers.
export const create = mutation({
  args: { body: v.string() },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Must be authenticated");
    const trimmed = args.body.trim();
    if (!trimmed) throw new Error("Announcement cannot be empty");

    const id = await ctx.db.insert("announcements", {
      authorId: me._id,
      body: trimmed,
      replyCount: 0,
    });

    // Notify followers
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", me._id))
      .collect();

    await Promise.all(
      followers.map((f) =>
        ctx.db.insert("notifications", {
          userId: f.followerId,
          type: "announcement",
          title: `${me.name || "An author you follow"} posted an announcement`,
          message: trimmed.slice(0, 140),
          isRead: false,
          // Include authorId + announcementId for deep link navigation
          relatedId: JSON.stringify({ authorId: String(me._id), announcementId: String(id) }),
        })
      )
    );

    return id;
  },
});

// Reply to an announcement. Notifies the announcement author.
export const reply = mutation({
  args: { announcementId: v.id("announcements"), body: v.string() },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Must be authenticated");
    const trimmed = args.body.trim();
    if (!trimmed) throw new Error("Reply cannot be empty");

    const ann = await ctx.db.get(args.announcementId);
    if (!ann) throw new Error("Announcement not found");

    const replyId = await ctx.db.insert("announcementReplies", {
      announcementId: args.announcementId,
      authorId: me._id,
      body: trimmed,
    });

    await ctx.db.patch(args.announcementId, { replyCount: (ann.replyCount || 0) + 1 });

    // Notify announcement author (skip self)
    if (ann.authorId !== me._id) {
      await ctx.db.insert("notifications", {
        userId: ann.authorId,
        type: "announcement_reply",
        title: "New reply to your announcement",
        message: trimmed.slice(0, 140),
        isRead: false,
        // Add deep link payload (author is the announcement author)
        relatedId: JSON.stringify({ authorId: String(ann.authorId), announcementId: String(args.announcementId) }),
      });
    }

    return replyId;
  },
});

export const deleteAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Must be authenticated");

    const ann = await ctx.db.get(args.announcementId);
    if (!ann) throw new Error("Announcement not found");
    if (ann.authorId !== me._id) throw new Error("Not authorized");

    // Delete all replies for this announcement
    const replies = await ctx.db
      .query("announcementReplies")
      .withIndex("by_announcement", (q) => q.eq("announcementId", args.announcementId))
      .collect();
    for (const r of replies) {
      await ctx.db.delete(r._id);
    }

    await ctx.db.delete(args.announcementId);
    return true;
  },
});

export const deleteReply = mutation({
  args: { replyId: v.id("announcementReplies") },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Must be authenticated");

    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");

    const ann = await ctx.db.get(reply.announcementId);
    if (!ann) throw new Error("Announcement not found");

    const isReplyAuthor = reply.authorId === me._id;
    const isAnnouncementAuthor = ann.authorId === me._id;
    if (!isReplyAuthor && !isAnnouncementAuthor) throw new Error("Not authorized");

    await ctx.db.delete(args.replyId);
    // Decrement replyCount on parent announcement (guard against negatives)
    const newCount = Math.max(0, (ann.replyCount || 0) - 1);
    await ctx.db.patch(ann._id, { replyCount: newCount });

    return true;
  },
});