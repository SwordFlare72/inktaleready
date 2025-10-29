"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const sendOTPEmail = internalAction({
  args: {
    to: v.string(),
    otp: v.string(),
  },
  handler: async (ctx, args) => {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "InkTale <noreply@aiagentshub.site>", // You'll change this to your domain
        to: args.to,
        subject: "Your InkTale Verification Code",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">InkTale</h1>
              </div>
              <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Verify Your Email</h2>
                <p style="font-size: 16px; color: #666;">Thank you for signing up! Please use the verification code below to complete your registration:</p>
                <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                  <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea;">${args.otp}</div>
                </div>
                <p style="font-size: 14px; color: #999;">This code will expire in 10 minutes.</p>
                <p style="font-size: 14px; color: #999;">If you didn't request this code, please ignore this email.</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>© ${new Date().getFullYear()} InkTale. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${error}`);
    }
    
    const data = await response.json();
    return { success: true, emailId: data.id };
  },
});
