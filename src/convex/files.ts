"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

export const moderateUploadedImage = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args): Promise<{
    safe: boolean;
    confidence: number;
    categories: string[];
    reason: string;
    details: any;
  }> => {
    try {
      // Call the internal moderation action
      const result: any = await ctx.runAction(internal.imageModeration.moderateImage, {
        storageId: args.storageId,
      });

      // If image is not safe, delete it from storage
      if (!result.safe) {
        await ctx.storage.delete(args.storageId);
        throw new Error(result.reason || "Upload rejected: Inappropriate or unsafe content detected.");
      }

      // Return the moderation result
      return result;
    } catch (error: any) {
      // Delete the image if moderation fails
      try {
        await ctx.storage.delete(args.storageId);
      } catch (deleteError) {
        console.error("Failed to delete image after moderation failure:", deleteError);
      }
      
      throw error;
    }
  },
});