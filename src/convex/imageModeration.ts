"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
const sightengine = require("sightengine");

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

      // Download the image as a buffer since Convex URLs are signed and may not be accessible
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBlob = new Blob([imageBuffer]);

      // Initialize Sightengine client
      const client = sightengine(apiUser, apiSecret);

      // Create a proper FormData with the image blob
      const formData = new FormData();
      formData.append('media', imageBlob, 'image.jpg');
      formData.append('models', 'nudity-2.1,wad,offensive,text-content,qr-content,scam');
      formData.append('api_user', apiUser);
      formData.append('api_secret', apiSecret);

      const response = await fetch('https://api.sightengine.com/1.0/check.json', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sightengine API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      console.log("Sightengine moderation result:", JSON.stringify(result, null, 2));

      // Analyze results with strict thresholds (0.4-0.5)
      const nudityScore = Math.max(
        result.nudity?.raw || 0,
        result.nudity?.partial || 0
      );
      const weaponScore = result.weapon?.prob || 0;
      const alcoholScore = result.alcohol?.prob || 0;
      const drugsScore = result.drugs?.prob || 0;
      const wadScore = result.wad?.prob || 0; // Combined weapons-alcohol-drugs
      const offensiveScore = result.offensive?.prob || 0;
      const qrcodeScore = result['qr-content']?.prob || 0;
      const scamScore = result.scam?.prob || 0;

      // Text content checks
      const hasInappropriateText = result.text?.has_inappropriate || false;
      const textProfanityScore = result.text?.profanity || 0;

      // Strict threshold of 0.4-0.5
      const threshold = 0.4;
      const qrcodeThreshold = 0.5; // Slightly higher for QR codes
      const textThreshold = 0.4;

      // Determine if content is safe
      const isSafe =
        nudityScore < threshold &&
        weaponScore < threshold &&
        alcoholScore < threshold &&
        drugsScore < threshold &&
        wadScore < threshold &&
        offensiveScore < threshold &&
        qrcodeScore < qrcodeThreshold &&
        scamScore < threshold &&
        !hasInappropriateText &&
        textProfanityScore < textThreshold;

      // Build detailed categories list for unsafe content
      const categories: string[] = [];
      const reasons: string[] = [];

      if (nudityScore >= threshold) {
        categories.push("nudity");
        reasons.push("nudity or sexual content");
      }
      if (weaponScore >= threshold) {
        categories.push("weapons");
        reasons.push("weapons");
      }
      if (alcoholScore >= threshold) {
        categories.push("alcohol");
        reasons.push("alcohol");
      }
      if (drugsScore >= threshold) {
        categories.push("drugs");
        reasons.push("drugs");
      }
      if (wadScore >= threshold) {
        categories.push("wad");
        reasons.push("weapons, alcohol, or drugs");
      }
      if (offensiveScore >= threshold) {
        categories.push("offensive");
        reasons.push("offensive content");
      }
      if (qrcodeScore >= qrcodeThreshold) {
        categories.push("qr-content");
        reasons.push("QR codes");
      }
      if (scamScore >= threshold) {
        categories.push("scam");
        reasons.push("scam-related content");
      }
      if (hasInappropriateText || textProfanityScore >= textThreshold) {
        categories.push("inappropriate-text");
        reasons.push("inappropriate text");
      }

      const maxScore = Math.max(
        nudityScore,
        weaponScore,
        alcoholScore,
        drugsScore,
        wadScore,
        offensiveScore,
        qrcodeScore,
        scamScore,
        textProfanityScore
      );

      return {
        safe: isSafe,
        confidence: maxScore,
        categories: categories.length > 0 ? categories : ["safe"],
        reason: reasons.length > 0 
          ? `Upload rejected: Inappropriate or unsafe content detected (${reasons.join(", ")}).`
          : "Content is safe",
        details: {
          nudity: nudityScore,
          weapons: weaponScore,
          alcohol: alcoholScore,
          drugs: drugsScore,
          wad: wadScore,
          offensive: offensiveScore,
          qrcode: qrcodeScore,
          scam: scamScore,
          inappropriateText: hasInappropriateText,
          textProfanity: textProfanityScore,
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