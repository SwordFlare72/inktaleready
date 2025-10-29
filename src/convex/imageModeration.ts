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
      console.error("Cloudflare credentials missing:", { 
        hasAccountId: !!accountId, 
        hasApiToken: !!apiToken 
      });
      throw new Error(
        "Cloudflare credentials not configured. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your environment variables."
      );
    }

    try {
      // Fetch the image
      console.log("Fetching image for moderation:", args.imageUrl);
      const imageResponse = await fetch(args.imageUrl);
      if (!imageResponse.ok) {
        console.error("Failed to fetch image:", imageResponse.status, imageResponse.statusText);
        throw new Error(`Failed to fetch image for moderation: ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString("base64");
      console.log("Image converted to base64, size:", base64Image.length);

      // Call Cloudflare AI with NSFW detection model
      const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/defog/nsfw-detector`;
      console.log("Calling Cloudflare AI API:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Cloudflare AI request failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(
          `Cloudflare AI request failed: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      console.log("Cloudflare AI response:", JSON.stringify(result, null, 2));

      // Parse NSFW detection model response
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
      } else {
        console.warn("Unexpected API response format:", result);
      }

      console.log("Moderation result:", { isSafe, analysis, categories, confidence });

      return {
        isSafe,
        analysis,
        categories,
        confidence,
      };
    } catch (error: any) {
      console.error("Image moderation error:", error);
      console.error("Error stack:", error.stack);
      throw new Error(
        `Image moderation failed: ${error.message || "Unknown error"}`
      );
    }
  },
});