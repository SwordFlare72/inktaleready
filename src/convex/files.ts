"use node";

import { action, query } from "./_generated/server";
import { v } from "convex/values";

export const getUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    const url = await ctx.storage.generateUploadUrl();
    return url;
  },
});

export const getFileUrl = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return url;
  },
});
