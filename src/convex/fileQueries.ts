import { query } from "./_generated/server";
import { v } from "convex/values";

export const getFileUrlQuery = query({
  args: { storageId: v.union(v.id("_storage"), v.null()) },
  handler: async (ctx, args) => {
    if (!args.storageId) return null;
    const url = await ctx.storage.getUrl(args.storageId);
    return url;
  },
});
