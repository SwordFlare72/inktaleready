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
    success: boolean;
    storageId: string;
    moderation: {
      isSafe: boolean;
      analysis: string;
      categories: string[];
      confidence?: number;
    };
  }> => {
    // Get the image URL from storage
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    
    if (!imageUrl) {
      throw new Error("Image not found in storage");
    }

    // Call moderation action
    const result: {
      isSafe: boolean;
      analysis: string;
      categories: string[];
      confidence?: number;
    } = await ctx.runAction(internal.imageModeration.moderateImage, {
      imageUrl,
    });

    // If image is unsafe, delete it from storage
    if (!result.isSafe) {
      await ctx.storage.delete(args.storageId);
      throw new Error(
        `Image rejected: ${result.categories.join(", ")}. ${result.analysis}`
      );
    }

    return {
      success: true,
      storageId: args.storageId,
      moderation: result,
    };
  },
});