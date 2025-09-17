import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Create a report
export const createReport = mutation({
  args: {
    targetType: v.union(v.literal("story"), v.literal("chapter")),
    targetId: v.string(),
    reason: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    return await ctx.db.insert("reports", {
      userId: user._id,
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason,
      details: args.details,
      status: "pending",
    });
  },
});

// Get reports by target (admin only)
export const getReportsByTarget = query({
  args: {
    targetType: v.union(v.literal("story"), v.literal("chapter")),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return [];

    return await ctx.db
      .query("reports")
      .withIndex("by_target", (q) => 
        q.eq("targetType", args.targetType).eq("targetId", args.targetId)
      )
      .collect();
  },
});
