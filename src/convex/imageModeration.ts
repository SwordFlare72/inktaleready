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

      // Call Cloudflare AI with Llama 3.2-Vision model
      const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`;
      console.log("Calling Cloudflare AI API:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this image for inappropriate content. Check for: nudity, sexual content, violence, gore, hate symbols, or other NSFW material. Respond with ONLY a JSON object in this exact format: {\"isSafe\": true/false, \"categories\": [\"category1\", \"category2\"], \"confidence\": 0.0-1.0, \"reason\": \"brief explanation\"}. Be strict in your assessment."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 256
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

      // Parse vision model response
      let isSafe = true;
      let confidence = 0;
      const categories: string[] = [];
      let analysis = "Image appears safe";

      if (result.result && result.result.response) {
        const responseText = result.result.response;
        console.log("Vision model response text:", responseText);
        
        try {
          // Try to extract JSON from the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            isSafe = parsed.isSafe !== false;
            confidence = parsed.confidence || 0;
            
            if (parsed.categories && Array.isArray(parsed.categories)) {
              categories.push(...parsed.categories);
            }
            
            analysis = parsed.reason || (isSafe ? "Image appears safe" : "Image contains inappropriate content");
            
            // If marked as unsafe or confidence is high for unsafe content
            if (!isSafe || confidence > 0.5) {
              isSafe = false;
            }
          } else {
            // Fallback: check for keywords in response
            const lowerResponse = responseText.toLowerCase();
            const unsafeKeywords = ['nsfw', 'nudity', 'sexual', 'violence', 'gore', 'inappropriate', 'unsafe', 'explicit'];
            const foundUnsafe = unsafeKeywords.some(keyword => lowerResponse.includes(keyword));
            
            if (foundUnsafe) {
              isSafe = false;
              categories.push("potentially_inappropriate");
              analysis = "Image may contain inappropriate content based on AI analysis";
              confidence = 0.7;
            }
          }
        } catch (parseError) {
          console.warn("Could not parse vision model JSON response:", parseError);
          // Default to safe if we can't parse
          analysis = "Could not fully analyze image, defaulting to safe";
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