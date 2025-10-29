"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const moderateImage = internalAction({
  args: { imageUrl: v.string() },
  handler: async (ctx, args): Promise<{
    isSafe: boolean;
    analysis: string;
    categories: string[];
    confidence?: number;
  }> => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      throw new Error(
        "Cloudflare credentials not configured. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your environment variables."
      );
    }

    try {
      // Fetch the image
      const imageResponse = await fetch(args.imageUrl);
      if (!imageResponse.ok) {
        throw new Error("Failed to fetch image for moderation");
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString("base64");

      // Call Cloudflare AI with NSFW detection model
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@hf/falconsai/nsfw_image_detection`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: base64Image,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Cloudflare AI request failed: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();

      // Parse NSFW detection model response
      // The model returns an array of predictions with labels and scores
      // Example: [{ label: "nsfw", score: 0.95 }, { label: "normal", score: 0.05 }]
      
      let isSafe = true;
      let confidence = 0;
      const categories: string[] = [];
      let analysis = "Image appears safe";

      if (result.result && Array.isArray(result.result)) {
        // Find the prediction with highest score
        const nsfwPrediction = result.result.find((pred: any) => 
          pred.label && pred.label.toLowerCase() === "nsfw"
        );
        
        if (nsfwPrediction && nsfwPrediction.score) {
          confidence = nsfwPrediction.score;
          
          // Flag as unsafe if NSFW score is above 0.5 (50% confidence)
          if (confidence > 0.5) {
            isSafe = false;
            categories.push("nsfw");
            analysis = `Image flagged as NSFW with ${(confidence * 100).toFixed(1)}% confidence`;
          } else {
            analysis = `Image appears safe (NSFW confidence: ${(confidence * 100).toFixed(1)}%)`;
          }
        }
      }

      return {
        isSafe,
        analysis,
        categories,
        confidence,
      };
    } catch (error: any) {
      console.error("Image moderation error:", error);
      throw new Error(
        `Image moderation failed: ${error.message || "Unknown error"}`
      );
    }
  },
});