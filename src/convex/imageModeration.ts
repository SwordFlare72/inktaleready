"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const moderateImage = internalAction({
  args: { 
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      console.error("Cloudflare credentials not configured");
      // Allow upload if moderation is not configured (fail open for development)
      return {
        isSafe: true,
        analysis: "Moderation not configured",
        categories: [],
      };
    }

    try {
      // Fetch the image from Convex storage
      const imageResponse = await fetch(args.imageUrl);
      if (!imageResponse.ok) {
        throw new Error("Failed to fetch image");
      }

      const buffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      // Call Cloudflare AI vision model
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
        {
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
                    type: "image",
                    image: base64,
                  },
                  {
                    type: "text",
                    text: 'Analyze this image for inappropriate content. Identify: 1) NSFW content (explicit/sexual material, nudity), 2) Violence or graphic content, 3) Hateful symbols or imagery. Respond ONLY with valid JSON in this exact format: {"has_nsfw": boolean, "has_violence": boolean, "has_hateful_content": boolean, "confidence": 0-1, "details": "brief description"}',
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.result?.response || "";

      // Try to parse JSON response
      try {
        // Extract JSON from response (model might add extra text)
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }

        const parsed = JSON.parse(jsonMatch[0]);
        
        const isSafe = !parsed.has_nsfw && !parsed.has_violence && !parsed.has_hateful_content;
        const categories: string[] = [];
        
        if (parsed.has_nsfw) categories.push("NSFW");
        if (parsed.has_violence) categories.push("Violence");
        if (parsed.has_hateful_content) categories.push("Hateful Content");

        return {
          isSafe,
          analysis: parsed.details || "Content analyzed",
          categories,
          confidence: parsed.confidence || 0.5,
        };
      } catch (parseError) {
        console.error("Failed to parse moderation response:", analysisText);
        // If parsing fails, be conservative and flag as unsafe if certain keywords appear
        const lowerText = analysisText.toLowerCase();
        const hasWarningKeywords = 
          lowerText.includes("nsfw") || 
          lowerText.includes("explicit") || 
          lowerText.includes("inappropriate") ||
          lowerText.includes("violence") ||
          lowerText.includes("graphic");

        return {
          isSafe: !hasWarningKeywords,
          analysis: analysisText.substring(0, 200),
          categories: hasWarningKeywords ? ["Flagged"] : [],
          confidence: 0.5,
        };
      }
    } catch (error: any) {
      console.error("Image moderation error:", error);
      // Fail open - allow upload if moderation service fails
      return {
        isSafe: true,
        analysis: `Moderation service error: ${error.message}`,
        categories: [],
      };
    }
  },
});
