"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

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

      console.log("Moderating image with Sightengine (sequential):", args.storageId);

      // Download the image as a buffer once
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Define models to check sequentially (most critical first)
      const modelsToCheck = [
        { name: "nudity", label: "nudity or sexual content", threshold: 0.4 },
        { name: "wad", label: "weapons, alcohol, or drugs", threshold: 0.4 },
        { name: "offensive", label: "offensive content", threshold: 0.4 },
      ];

      // Helper function to check a single model
      const checkModel = async (modelName: string) => {
        const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
        const parts: Buffer[] = [];
        
        // Add media field
        parts.push(Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="media"; filename="image.jpg"\r\n` +
          `Content-Type: image/jpeg\r\n\r\n`
        ));
        parts.push(Buffer.from(imageBuffer));
        parts.push(Buffer.from('\r\n'));
        
        // Add models field
        parts.push(Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="models"\r\n\r\n` +
          `${modelName}\r\n`
        ));
        
        // Add api_user field
        parts.push(Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="api_user"\r\n\r\n` +
          `${apiUser}\r\n`
        ));
        
        // Add api_secret field
        parts.push(Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="api_secret"\r\n\r\n` +
          `${apiSecret}\r\n`
        ));
        
        // Add closing boundary
        parts.push(Buffer.from(`--${boundary}--\r\n`));
        
        const body = Buffer.concat(parts);

        console.log(`Checking model: ${modelName}...`);

        const response = await fetch('https://api.sightengine.com/1.0/check.json', {
          method: 'POST',
          body,
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Sightengine API error for ${modelName}:`, errorText);
          throw new Error(`Sightengine API error: ${response.status} - ${errorText}`);
        }

        return await response.json();
      };

      // Check models sequentially, stopping at first failure
      let allDetails: any = {};
      let failedModel: { name: string; label: string; score: number } | null = null;

      for (const model of modelsToCheck) {
        const result = await checkModel(model.name);
        console.log(`${model.name} result:`, JSON.stringify(result, null, 2));

        // Extract score based on model type
        let score = 0;
        if (model.name === "nudity") {
          score = Math.max(result.nudity?.raw || 0, result.nudity?.partial || 0);
          allDetails.nudity = score;
        } else if (model.name === "wad") {
          score = result.wad?.prob || 0;
          allDetails.wad = score;
          allDetails.weapons = result.weapon?.prob || 0;
          allDetails.alcohol = result.alcohol?.prob || 0;
          allDetails.drugs = result.drugs?.prob || 0;
        } else if (model.name === "offensive") {
          score = result.offensive?.prob || 0;
          allDetails.offensive = score;
        }

        // Check if this model detected inappropriate content
        if (score >= model.threshold) {
          failedModel = { name: model.name, label: model.label, score };
          console.log(`❌ Image failed ${model.name} check (score: ${score})`);
          break; // Stop checking further models
        } else {
          console.log(`✅ Image passed ${model.name} check (score: ${score})`);
        }
      }

      // Determine final result
      if (failedModel) {
        return {
          safe: false,
          confidence: failedModel.score,
          categories: [failedModel.name],
          reason: `Upload rejected: Inappropriate or unsafe content detected (${failedModel.label}).`,
          details: allDetails,
        };
      }

      // All checks passed
      return {
        safe: true,
        confidence: 0,
        categories: ["safe"],
        reason: "Content is safe",
        details: allDetails,
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