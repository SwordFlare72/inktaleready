import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Generate and send OTP
export const generateOTP = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10-minute expiration
    const expiresAt = Date.now() + 10 * 60 * 1000;
    
    // Delete any existing OTPs for this email
    const existing = await ctx.db
      .query("otpVerifications")
      .filter((q) => q.eq(q.field("email"), email))
      .collect();
    
    for (const record of existing) {
      await ctx.db.delete(record._id);
    }
    
    // Create new OTP record
    await ctx.db.insert("otpVerifications", {
      email,
      otp,
      expiresAt,
      attempts: 0,
    });
    
    // Send email via Resend (schedule action to avoid blocking)
    await ctx.scheduler.runAfter(0, internal.sendEmails.sendOTPEmail, {
      to: email,
      otp,
    });
    
    return { success: true };
  },
});

// Verify OTP
export const verifyOTP = mutation({
  args: { 
    email: v.string(),
    otp: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const otp = args.otp.trim();
    
    // Find OTP record
    const record = await ctx.db
      .query("otpVerifications")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    
    if (!record) {
      throw new Error("No OTP found. Please request a new one.");
    }
    
    // Check expiration
    if (Date.now() > record.expiresAt) {
      await ctx.db.delete(record._id);
      throw new Error("OTP expired. Please request a new one.");
    }
    
    // Check attempts (max 3)
    if (record.attempts >= 3) {
      await ctx.db.delete(record._id);
      throw new Error("Too many failed attempts. Please request a new OTP.");
    }
    
    // Verify OTP
    if (record.otp !== otp) {
      await ctx.db.patch(record._id, {
        attempts: record.attempts + 1,
      });
      throw new Error("Invalid OTP. Please try again.");
    }
    
    // Success - delete OTP record
    await ctx.db.delete(record._id);
    
    return { success: true };
  },
});
