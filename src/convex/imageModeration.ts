"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import sightengine from "sightengine";

export const moderateImage = internalAction({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const apiUser = process.env.SIGHTENGINE_API_USER;
    const apiSecret = process.env.SIGHTENGINE_API_SECRET;

    if (!apiUser || !apiSecret) {
      console.error("Missing Sightengine credentials");
      throw new Error(
        "Image moderation not configured. Please add SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET environment variables."
      );
    }

    try {
      // Get the image URL from storage
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      if (!imageUrl) {
        throw new Error("Could not retrieve image URL from storage");
      }

      console.log("Moderating image with Sightengine:", args.storageId);

      // Initialize Sightengine client
      const client = sightengine(apiUser, apiSecret);

      // Check image for multiple content types
      const result = await client
        .check(["nudity-2.1", "weapon", "gore-2.0", "offensive", "wad"])
        .set_url(imageUrl);

      console.log("Sightengine moderation result:", JSON.stringify(result, null, 2));

      // Analyze results with thresholds
      const nudityScore = Math.max(
        result.nudity?.raw || 0,
        result.nudity?.partial || 0
      );
      const weaponScore = result.weapon?.prob || 0;
      const goreScore = result.gore?.prob || 0;
      const offensiveScore = result.offensive?.prob || 0;
      const drugsScore = result.wad?.prob || 0;

      // Determine if content is safe (using 0.5 threshold for most categories)
      const isSafe =
        nudityScore < 0.5 &&
        weaponScore < 0.5 &&
        goreScore < 0.5 &&
        offensiveScore < 0.5 &&
        drugsScore < 0.5;

      // Build categories list for unsafe content
      const categories: string[] = [];
      if (nudityScore >= 0.5) categories.push("nudity");
      if (weaponScore >= 0.5) categories.push("weapons");
      if (goreScore >= 0.5) categories.push("gore");
      if (offensiveScore >= 0.5) categories.push("offensive");
      if (drugsScore >= 0.5) categories.push("drugs");

      const maxScore = Math.max(
        nudityScore,
        weaponScore,
        goreScore,
        offensiveScore,
        drugsScore
      );

      return {
        safe: isSafe,
        confidence: maxScore,
        categories: categories.length > 0 ? categories : ["safe"],
        details: {
          nudity: nudityScore,
          weapons: weaponScore,
          gore: goreScore,
          offensive: offensiveScore,
          drugs: drugsScore,
        },
      };
    } catch (error: any) {
      console.error("Sightengine moderation error:", error);
      
      if (error.message?.includes("401") || error.message?.includes("authentication")) {
        throw new Error("Invalid Sightengine API credentials. Please check your API User and API Secret.");
      }
      
      if (error.message?.includes("quota") || error.message?.includes("limit")) {
        throw new Error("Sightengine API quota exceeded. Please upgrade your plan or wait for quota reset.");
      }

      throw new Error(`Image moderation failed: ${error.message || "Unknown error"}`);
    }
  },
});
