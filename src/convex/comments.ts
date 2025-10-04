import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get comments for a chapter
export const getCommentsByChapter = query({
  args: { 
    chapterId: v.id("chapters"),
    sortBy: v.optional(v.union(v.literal("recent"), v.literal("oldest"), v.literal("likes"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("comments")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .filter((q) => q.eq(q.field("parentCommentId"), undefined));

    const comments = await query.collect();

    // Get author info and replies for each comment
    const commentsWithDetails = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        
        // Get replies
        const replies = await ctx.db
          .query("comments")
          .withIndex("by_parent", (q) => q.eq("parentCommentId", comment._id))
          .collect();

        const repliesWithAuthors = await Promise.all(
          replies.map(async (reply) => {
            const replyAuthor = await ctx.db.get(reply.authorId);
            return {
              ...reply,
              author: replyAuthor ? { 
                name: replyAuthor.name,
                _id: replyAuthor._id 
              } : null,
            };
          })
        );

        return {
          ...comment,
          author: author ? { 
            name: author.name,
            _id: author._id 
          } : null,
          replies: repliesWithAuthors,
        };
      })
    );

    // Sort comments
    if (args.sortBy === "likes") {
      commentsWithDetails.sort((a, b) => b.likes - a.likes);
    } else if (args.sortBy === "oldest") {
      commentsWithDetails.sort((a, b) => a._creationTime - b._creationTime);
    } else {
      // Default to recent
      commentsWithDetails.sort((a, b) => b._creationTime - a._creationTime);
    }

    return commentsWithDetails;
  },
});

// Create a comment
export const createComment = mutation({
  args: {
    chapterId: v.id("chapters"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const commentId = await ctx.db.insert("comments", {
      chapterId: args.chapterId,
      authorId: user._id,
      content: args.content,
      likes: 0,
      dislikes: 0,
      isHidden: false,
      parentCommentId: args.parentCommentId,
    });

    // Notify parent comment author if this is a reply
    if (args.parentCommentId) {
      const parentComment = await ctx.db.get(args.parentCommentId);
      if (parentComment && parentComment.authorId !== user._id) {
        await ctx.db.insert("notifications", {
          userId: parentComment.authorId,
          type: "comment_reply",
          title: "New Reply",
          message: `${user.name || "Someone"} replied to your comment`,
          isRead: false,
          relatedId: commentId,
        });
      }
    }

    // Update chapter comment count
    const chapter = await ctx.db.get(args.chapterId);
    if (chapter) {
      await ctx.db.patch(args.chapterId, {
        comments: chapter.comments + 1,
      });

      // Update story comment count
      const story = await ctx.db.get(chapter.storyId);
      if (story) {
        await ctx.db.patch(chapter.storyId, {
          totalComments: story.totalComments + 1,
        });
      }
    }

    return commentId;
  },
});

// React to a comment (like/dislike)
export const reactToComment = mutation({
  args: {
    commentId: v.id("comments"),
    isLike: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const existing = await ctx.db
      .query("commentReactions")
      .withIndex("by_user_and_comment", (q) => 
        q.eq("userId", user._id).eq("commentId", args.commentId)
      )
      .unique();

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    if (existing) {
      // Update existing reaction
      if (existing.isLike !== args.isLike) {
        await ctx.db.patch(existing._id, { isLike: args.isLike });
        
        // Update comment counts
        if (args.isLike) {
          await ctx.db.patch(args.commentId, {
            likes: comment.likes + 1,
            dislikes: Math.max(0, comment.dislikes - 1),
          });
        } else {
          await ctx.db.patch(args.commentId, {
            likes: Math.max(0, comment.likes - 1),
            dislikes: comment.dislikes + 1,
          });
        }
      } else {
        // Remove reaction
        await ctx.db.delete(existing._id);
        if (args.isLike) {
          await ctx.db.patch(args.commentId, {
            likes: Math.max(0, comment.likes - 1),
          });
        } else {
          await ctx.db.patch(args.commentId, {
            dislikes: Math.max(0, comment.dislikes - 1),
          });
        }
      }
    } else {
      // Create new reaction
      await ctx.db.insert("commentReactions", {
        userId: user._id,
        commentId: args.commentId,
        isLike: args.isLike,
      });

      if (args.isLike) {
        await ctx.db.patch(args.commentId, {
          likes: comment.likes + 1,
        });
      } else {
        await ctx.db.patch(args.commentId, {
          dislikes: comment.dislikes + 1,
        });
      }
    }

    // Auto-hide comment if it has 10+ dislikes
    const updatedComment = await ctx.db.get(args.commentId);
    if (updatedComment && updatedComment.dislikes >= 10 && !updatedComment.isHidden) {
      await ctx.db.patch(args.commentId, { isHidden: true });
    }

    return true;
  },
});

// Delete a comment
export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Check if user is the author or has admin role
    if (comment.authorId !== user._id && user.role !== "admin") {
      throw new Error("Not authorized to delete this comment");
    }

    await ctx.db.delete(args.commentId);

    // Update chapter comment count
    const chapter = await ctx.db.get(comment.chapterId);
    if (chapter) {
      await ctx.db.patch(comment.chapterId, {
        comments: Math.max(0, chapter.comments - 1),
      });
    }

    return true;
  },
});