"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const sendOTPEmail = internalAction({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not set in environment variables");
      throw new Error("Email service not configured. Please add RESEND_API_KEY in the API Keys tab.");
    }

    console.log("Attempting to send OTP email to:", args.email);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "InkTale <onboarding@resend.dev>",
          to: args.email,
          subject: "Your InkTale Verification Code",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Welcome to InkTale!</h2>
              <p>Your verification code is:</p>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                ${args.code}
              </div>
              <p style="color: #666;">This code will expire in 10 minutes.</p>
              <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Resend API error response:", error);
        console.error("Response status:", response.status);
        throw new Error(`Failed to send email: ${response.status} - ${error}`);
      }

      const result = await response.json();
      console.log("OTP email sent successfully:", result);
      return { success: true };
    } catch (error) {
      console.error("Error sending OTP email:", error);
      throw error;
    }
  },
});
