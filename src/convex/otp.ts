import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Generate a 6-digit OTP code
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple hash function for OTP (V8-compatible)
function hashOTP(code: string): string {
  // Use a simple base64 encoding that works in V8 runtime
  // In production, the actual verification happens by comparing hashed values
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Rate limiting: Check if user can request OTP
export const canRequestOTP = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 60 seconds

    // Check for recent OTP requests
    const recentOTP = await ctx.db
      .query("otpVerifications")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.gte(q.field("createdAt"), oneMinuteAgo))
      .first();

    return !recentOTP;
  },
});

// Generate and send OTP
export const generateOTP = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Rate limiting check
    const recentOTP = await ctx.db
      .query("otpVerifications")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.gte(q.field("createdAt"), oneMinuteAgo))
      .first();

    if (recentOTP) {
      throw new Error("Please wait 60 seconds before requesting another OTP");
    }

    // Generate OTP
    const code = generateOTPCode();
    const hashedCode = hashOTP(code);
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    await ctx.db.insert("otpVerifications", {
      email,
      code: hashedCode,
      expiresAt,
      attempts: 0,
      isUsed: false,
      createdAt: now,
    });

    // Schedule email sending
    await ctx.scheduler.runAfter(0, internal.sendEmails.sendOTPEmail, {
      email,
      code,
    });

    return { success: true };
  },
});

// Verify OTP
export const verifyOTP = mutation({
  args: { email: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const code = args.code.trim();
    const now = Date.now();

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      throw new Error("Invalid OTP format");
    }

    // Find valid OTP
    const otpRecord = await ctx.db
      .query("otpVerifications")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => 
        q.and(
          q.eq(q.field("isUsed"), false),
          q.gte(q.field("expiresAt"), now)
        )
      )
      .first();

    if (!otpRecord) {
      throw new Error("OTP expired or not found");
    }

    // Check attempts (max 5)
    if (otpRecord.attempts >= 5) {
      await ctx.db.patch(otpRecord._id, { isUsed: true });
      throw new Error("Too many attempts. Please request a new OTP");
    }

    // Verify code
    const hashedInput = hashOTP(code);
    if (hashedInput !== otpRecord.code) {
      await ctx.db.patch(otpRecord._id, {
        attempts: otpRecord.attempts + 1,
      });
      throw new Error("Invalid OTP");
    }

    // Mark as used
    await ctx.db.patch(otpRecord._id, { isUsed: true });

    // Mark user email as verified
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        emailVerificationTime: now,
      });
    }

    return { success: true, verified: true };
  },
});

// Cleanup expired OTPs (can be called via cron)
export const cleanupExpiredOTPs = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("otpVerifications")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const otp of expired) {
      await ctx.db.delete(otp._id);
    }

    return { deleted: expired.length };
  },
});